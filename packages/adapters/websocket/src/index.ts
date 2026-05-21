import type { Adapter, MutationContext, TargetRef } from "@stalezero/core";

export type SocketIoLike = {
  to: (room: string) => { emit: (event: string, payload?: unknown) => unknown };
};

export type WsClientLike = {
  readyState?: number;
  send: (data: string) => unknown;
};

export type WebSocketAdapterOptions = {
  name?: string;
  io?: SocketIoLike;
  clients?: Iterable<WsClientLike>;
  emit?: (room: string, event: string, payload: unknown, context: MutationContext) => unknown;
  includePayload?: boolean;
  redact?: string[];
};

export function websocketAdapter(options: SocketIoLike | WebSocketAdapterOptions): Adapter<TargetRef<"socket">> {
  const config: WebSocketAdapterOptions = "to" in options ? { io: options } : options;

  return {
    name: config.name ?? "socket",
    execute: async (target, context) => {
      if (target.action !== "notify" && target.action !== "publish") {
        throw new Error(`WebSocket adapter does not support ${target.action}`);
      }
      const event = String(target.meta?.event ?? "stalezero.changed");
      const payload = payloadFor(target, context, config);

      if (config.emit) {
        await config.emit(target.key, event, payload, context);
        return;
      }

      if (config.io) {
        config.io.to(target.key).emit(event, payload);
        return;
      }

      if (config.clients) {
        const message = JSON.stringify({ room: target.key, event, payload });
        for (const client of config.clients) {
          if (client.readyState === undefined || client.readyState === 1) {
            client.send(message);
          }
        }
        return;
      }

      throw new Error("No WebSocket emitter was provided");
    }
  };
}

function payloadFor(target: TargetRef<"socket">, context: MutationContext, options: WebSocketAdapterOptions): unknown {
  const base = {
    mutation: context.mutation,
    target: target.key,
    affected: context.affected,
    input: options.includePayload === false ? undefined : context.input,
    receipt: context.id
  };
  if (!options.redact?.length) {
    return base;
  }
  return redact(base, new Set(options.redact));
}

function redact(value: unknown, keys: Set<string>): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redact(item, keys));
  }
  if (!value || typeof value !== "object") {
    return value;
  }
  const output: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value)) {
    output[key] = keys.has(key) ? "[redacted]" : redact(nested, keys);
  }
  return output;
}
