import type { EventBus, StaleEvent } from "@stalezero/core";

export type RedisPubSubClientLike = {
  publish: (channel: string, message: string) => Promise<unknown> | unknown;
  subscribe: (channel: string, handler?: (message: string) => void) => Promise<unknown> | unknown;
  unsubscribe?: (channel: string) => Promise<unknown> | unknown;
  on?: (event: "message", handler: (channel: string, message: string) => void) => unknown;
};

export type RedisStreamClientLike = {
  xAdd?: (stream: string, id: string, message: Record<string, string>) => Promise<unknown> | unknown;
  xadd?: (stream: string, id: string, ...args: string[]) => Promise<unknown> | unknown;
  xRead?: (
    streams: Array<{ key: string; id: string }>,
    options?: { BLOCK?: number; COUNT?: number }
  ) => Promise<Array<{ name: string; messages: Array<{ id: string; message: Record<string, string> }> }> | null> | Array<{ name: string; messages: Array<{ id: string; message: Record<string, string> }> }> | null;
  xread?: (...args: string[]) => Promise<Array<[string, Array<[string, string[]]>]> | null> | Array<[string, Array<[string, string[]]>]> | null;
};

export function redisPubSubBus(options: {
  publisher: RedisPubSubClientLike;
  subscriber: RedisPubSubClientLike;
  channel?: string;
  name?: string;
}): EventBus {
  const channel = options.channel ?? "stalezero.events";
  return {
    name: options.name ?? "redis-pubsub",
    publish: async (event) => {
      await options.publisher.publish(channel, JSON.stringify(event));
    },
    subscribe: async (handler) => {
      const onMessage = (messageChannel: string, message: string) => {
        if (messageChannel === channel) {
          void handler({ ...JSON.parse(message), hops: JSON.parse(message).hops + 1 });
        }
      };

      if (options.subscriber.on) {
        options.subscriber.on("message", onMessage);
        await options.subscriber.subscribe(channel);
      } else {
        await options.subscriber.subscribe(channel, (message) => {
          const event = JSON.parse(message) as StaleEvent;
          void handler({ ...event, hops: event.hops + 1 });
        });
      }

      return async () => {
        await options.subscriber.unsubscribe?.(channel);
      };
    }
  };
}

export function redisStreamBus(options: {
  client: RedisStreamClientLike;
  stream?: string;
  name?: string;
  startId?: string;
  blockMs?: number;
  count?: number;
  pollIntervalMs?: number;
}): EventBus {
  const stream = options.stream ?? "stalezero.events";
  return {
    name: options.name ?? "redis-stream",
    publish: async (event) => {
      const fields = { event: JSON.stringify(event), mutation: event.mutation, id: event.id };
      if (options.client.xAdd) {
        await options.client.xAdd(stream, "*", fields);
      } else if (options.client.xadd) {
        await options.client.xadd(stream, "*", ...Object.entries(fields).flat());
      } else {
        throw new Error("Redis stream client does not expose xAdd()");
      }
    },
    subscribe: async (handler) => {
      if (!options.client.xRead && !options.client.xread) {
        throw new Error("Redis stream subscription requires xRead() or xread()");
      }
      let active = true;
      let lastId = options.startId ?? "$";
      void (async () => {
        while (active) {
          const entries = await readStream(options.client, stream, lastId, options);
          for (const entry of entries) {
            lastId = entry.id;
            if (!entry.message.event) {
              continue;
            }
            const event = JSON.parse(entry.message.event) as StaleEvent;
            await handler({ ...event, hops: event.hops + 1 });
          }
          if (entries.length === 0) {
            await sleep(options.pollIntervalMs ?? 50);
          }
        }
      })();
      return () => {
        active = false;
      };
    }
  };
}

async function readStream(
  client: RedisStreamClientLike,
  stream: string,
  lastId: string,
  options: { blockMs?: number; count?: number }
): Promise<Array<{ id: string; message: Record<string, string> }>> {
  if (client.xRead) {
    const result = await client.xRead([{ key: stream, id: lastId }], { BLOCK: options.blockMs ?? 1000, COUNT: options.count ?? 10 });
    return result?.[0]?.messages ?? [];
  }
  if (client.xread) {
    const result = await client.xread("BLOCK", String(options.blockMs ?? 1000), "COUNT", String(options.count ?? 10), "STREAMS", stream, lastId);
    const messages = result?.[0]?.[1] ?? [];
    return messages.map(([id, fields]) => ({ id, message: fieldsToRecord(fields) }));
  }
  return [];
}

function fieldsToRecord(fields: string[]): Record<string, string> {
  const output: Record<string, string> = {};
  for (let index = 0; index < fields.length; index += 2) {
    const key = fields[index];
    const value = fields[index + 1];
    if (key && value !== undefined) {
      output[key] = value;
    }
  }
  return output;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
