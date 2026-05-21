import type { EventBus, StaleEvent } from "@stalezero/core";

export type KafkaProducerLike = {
  send: (args: { topic: string; messages: Array<{ key?: string; value: string }> }) => Promise<unknown> | unknown;
};

export type KafkaConsumerLike = {
  subscribe: (args: { topic: string; fromBeginning?: boolean }) => Promise<unknown> | unknown;
  run: (args: { eachMessage: (args: { message: { value?: Buffer | string | null } }) => Promise<void> | void }) => Promise<unknown> | unknown;
  stop?: () => Promise<unknown> | unknown;
};

export function kafkaBus(options: { producer: KafkaProducerLike; consumer?: KafkaConsumerLike; topic?: string; name?: string }): EventBus {
  const topic = options.topic ?? "stalezero.events";
  return {
    name: options.name ?? "kafka",
    publish: async (event) => {
      await options.producer.send({ topic, messages: [{ key: event.mutation, value: JSON.stringify(event) }] });
    },
    subscribe: async (handler) => {
      if (!options.consumer) {
        throw new Error("Kafka consumer was not provided");
      }
      await options.consumer.subscribe({ topic, fromBeginning: false });
      await options.consumer.run({
        eachMessage: async ({ message }) => {
          if (!message.value) {
            return;
          }
          const raw = Buffer.isBuffer(message.value) ? message.value.toString("utf8") : String(message.value);
          const event = JSON.parse(raw) as StaleEvent;
          await handler({ ...event, hops: event.hops + 1 });
        }
      });
      return async () => {
        await options.consumer?.stop?.();
      };
    }
  };
}
