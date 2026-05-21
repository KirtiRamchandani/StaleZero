import type { EventBus, StaleEvent } from "@stalezero/core";

export type MemoryBus = EventBus & {
  events: StaleEvent[];
  deadLetters: Array<{ event: StaleEvent; error: unknown }>;
  clear: () => void;
  replay: (handler?: (event: StaleEvent) => Promise<void> | void) => Promise<void>;
};

export type MemoryBusOptions = {
  name?: string;
  dedupeTtlMs?: number;
  maxHops?: number;
};

export function memoryBus(options: string | MemoryBusOptions = "memory-bus"): MemoryBus {
  const config = typeof options === "string" ? { name: options } : options;
  const handlers = new Set<(event: StaleEvent) => Promise<void> | void>();
  const events: StaleEvent[] = [];
  const deadLetters: Array<{ event: StaleEvent; error: unknown }> = [];
  const seen = new Map<string, number>();

  return {
    name: config.name ?? "memory-bus",
    events,
    deadLetters,
    publish: async (event) => {
      pruneSeen(seen, config.dedupeTtlMs ?? 60_000);
      if (seen.has(event.id)) {
        return;
      }
      seen.set(event.id, Date.now());
      if (event.hops >= (config.maxHops ?? Number.POSITIVE_INFINITY)) {
        return;
      }
      events.push(event);
      await Promise.all(
        [...handlers].map(async (handler) => {
          const nextEvent = { ...event, hops: event.hops + 1 };
          try {
            await handler(nextEvent);
          } catch (error) {
            deadLetters.push({ event: nextEvent, error });
          }
        })
      );
    },
    subscribe: (handler) => {
      handlers.add(handler);
      return () => {
        handlers.delete(handler);
      };
    },
    clear: () => {
      events.length = 0;
      deadLetters.length = 0;
      seen.clear();
    },
    replay: async (handler) => {
      const targets = handler ? [handler] : [...handlers];
      for (const event of events) {
        await Promise.all(targets.map((target) => target({ ...event, hops: event.hops + 1 })));
      }
    }
  };
}

function pruneSeen(seen: Map<string, number>, ttlMs: number): void {
  const cutoff = Date.now() - ttlMs;
  for (const [id, timestamp] of seen) {
    if (timestamp < cutoff) {
      seen.delete(id);
    }
  }
}
