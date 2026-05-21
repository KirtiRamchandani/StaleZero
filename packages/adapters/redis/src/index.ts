import type { Adapter, TargetRef } from "@stalezero/core";

export type RedisClientLike = {
  del?: (...keys: string[]) => Promise<unknown> | unknown;
  unlink?: (...keys: string[]) => Promise<unknown> | unknown;
  expire?: (key: string, seconds: number) => Promise<unknown> | unknown;
  publish?: (channel: string, message: string) => Promise<unknown> | unknown;
  xAdd?: (stream: string, id: string, message: Record<string, string>) => Promise<unknown> | unknown;
  xadd?: (stream: string, id: string, ...args: string[]) => Promise<unknown> | unknown;
  scanIterator?: (options?: { MATCH?: string; COUNT?: number }) => AsyncIterable<string> | Iterable<string>;
  keys?: (pattern: string) => Promise<string[]> | string[];
};

export type RedisAdapterOptions = {
  name?: string;
  prefix?: string;
  useUnlink?: boolean;
  allowKeysFallback?: boolean;
  scanCount?: number;
  publishChannel?: string;
  stream?: string;
  protectPatterns?: boolean;
};

export function redisAdapter(client: RedisClientLike, options: RedisAdapterOptions = {}): Adapter<TargetRef<"redis">> {
  const name = options.name ?? "redis";
  const protectPatterns = options.protectPatterns ?? true;

  return {
    name,
    execute: async (target, context) => {
      const key = withPrefix(options.prefix, target.key);
      const meta = target.meta ?? {};

      if (target.action !== "delete" && target.action !== "remove" && target.action !== "custom") {
        throw new Error(`Redis adapter does not support ${target.action}`);
      }

      if (typeof meta.ttlSeconds === "number") {
        if (!client.expire) {
          throw new Error("Redis client does not expose expire()");
        }
        await client.expire(key, meta.ttlSeconds);
      } else if (meta.pattern === true) {
        if (protectPatterns) {
          assertSafePattern(key);
        }
        const keys = await scanKeys(client, key, options);
        if (keys.length > 0) {
          await deleteKeys(client, keys, options.useUnlink);
        }
      } else {
        await deleteKeys(client, [key], options.useUnlink);
      }

      if (options.publishChannel && client.publish) {
        await client.publish(options.publishChannel, JSON.stringify({ mutation: context.mutation, key, action: target.action }));
      }

      if (options.stream) {
        const body = {
          mutation: context.mutation,
          key,
          action: target.action,
          receipt: context.id,
          timestamp: String(context.timestamp)
        };
        if (client.xAdd) {
          await client.xAdd(options.stream, "*", body);
        } else if (client.xadd) {
          await client.xadd(options.stream, "*", ...Object.entries(body).flat());
        }
      }
    }
  };
}

async function deleteKeys(client: RedisClientLike, keys: string[], useUnlink = false): Promise<void> {
  if (useUnlink && client.unlink) {
    await client.unlink(...keys);
    return;
  }
  if (!client.del) {
    throw new Error("Redis client does not expose del()");
  }
  await client.del(...keys);
}

async function scanKeys(client: RedisClientLike, pattern: string, options: RedisAdapterOptions): Promise<string[]> {
  if (client.scanIterator) {
    const output: string[] = [];
    for await (const key of client.scanIterator({ MATCH: pattern, COUNT: options.scanCount ?? 500 })) {
      output.push(key);
    }
    return output;
  }

  if (options.allowKeysFallback && client.keys) {
    return client.keys(pattern);
  }

  throw new Error("Redis pattern deletion requires scanIterator() or allowKeysFallback");
}

function withPrefix(prefix: string | undefined, key: string): string {
  if (!prefix || key.startsWith(prefix)) {
    return key;
  }
  return `${prefix}${key}`;
}

function assertSafePattern(pattern: string): void {
  const stripped = pattern.replaceAll("*", "").replaceAll("?", "");
  if (!pattern.includes("*") || stripped.length < 3 || pattern === "*" || pattern.endsWith(":*:*")) {
    throw new Error(`Unsafe Redis pattern: ${pattern}`);
  }
}
