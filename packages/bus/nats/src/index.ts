import type { EventBus, StaleEvent } from "@stalezero/core";

export type NatsConnectionLike = {
  publish: (subject: string, payload: Uint8Array) => void;
  subscribe: (subject: string) => AsyncIterable<{ data: Uint8Array; unsubscribe?: () => void }> & { unsubscribe?: () => void };
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function natsBus(options: { connection: NatsConnectionLike; subject?: string; name?: string }): EventBus {
  const subject = options.subject ?? "stalezero.events";
  return {
    name: options.name ?? "nats",
    publish: (event) => {
      options.connection.publish(subject, encoder.encode(JSON.stringify(event)));
    },
    subscribe: async (handler) => {
      const subscription = options.connection.subscribe(subject);
      void (async () => {
        for await (const message of subscription) {
          const event = JSON.parse(decoder.decode(message.data)) as StaleEvent;
          await handler({ ...event, hops: event.hops + 1 });
        }
      })();
      return () => subscription.unsubscribe?.();
    }
  };
}
