import { describe, expect, it, vi } from "vitest";
import { redisStreamBus } from "./index.js";
import type { StaleEvent } from "@stalezero/core";

const event: StaleEvent = {
  id: "event-1",
  mutation: "ProductUpdated",
  input: {},
  affected: [],
  timestamp: 1,
  hops: 0
};

describe("redis stream bus", () => {
  it("publishes and subscribes through xRead", async () => {
    const published: Record<string, string>[] = [];
    let read = false;
    const client = {
      xAdd: vi.fn((_stream: string, _id: string, fields: Record<string, string>) => {
        published.push(fields);
      }),
      xRead: vi.fn(() => {
        if (read) {
          return null;
        }
        read = true;
        return [{ name: "events", messages: [{ id: "1-0", message: published[0] as Record<string, string> }] }];
      })
    };
    const bus = redisStreamBus({ client, stream: "events", pollIntervalMs: 1, blockMs: 1 });
    const seen: StaleEvent[] = [];

    await bus.publish(event);
    const stop = await bus.subscribe((next) => {
      seen.push(next);
    });
    await new Promise((resolve) => setTimeout(resolve, 5));
    await stop();

    expect(seen[0]).toMatchObject({ id: "event-1", hops: 1 });
  });
});
