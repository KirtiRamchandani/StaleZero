import { describe, expect, it } from "vitest";
import { memoryBus } from "./index.js";
import type { StaleEvent } from "@stalezero/core";

const event: StaleEvent = {
  id: "event-1",
  mutation: "ProductUpdated",
  input: {},
  affected: [],
  timestamp: 1,
  hops: 0
};

describe("memory bus", () => {
  it("dedupes events and records dead letters", async () => {
    const bus = memoryBus({ dedupeTtlMs: 1000 });
    await bus.subscribe(() => {
      throw new Error("handler failed");
    });

    await bus.publish(event);
    await bus.publish(event);

    expect(bus.events).toHaveLength(1);
    expect(bus.deadLetters).toHaveLength(1);
  });
});
