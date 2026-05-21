import { describe, expect, it, vi } from "vitest";
import { cleanupOutbox, fetchPendingOutboxEvents, insertOutboxEvent, markOutboxEventFailed, markOutboxEventProcessed, replayOutbox } from "./index.js";
import type { StaleEvent } from "@stalezero/core";

const event: StaleEvent = {
  id: "event-1",
  app: "api",
  mutation: "ProductUpdated",
  input: { id: "p1" },
  affected: [{ type: "Product", id: "p1" }],
  timestamp: 1,
  hops: 0
};

describe("postgres outbox helpers", () => {
  it("inserts, reads, marks, cleans, and replays events", async () => {
    const queries: string[] = [];
    const client = {
      query: vi.fn((sql: string) => {
        queries.push(sql);
        if (sql.includes("SELECT id")) {
          return {
            rows: [
              {
                id: event.id,
                app: event.app,
                mutation: event.mutation,
                payload: event.input,
                affected: event.affected,
                created_at: new Date(event.timestamp).toISOString()
              }
            ]
          };
        }
        return { rows: [] };
      })
    };

    await insertOutboxEvent(client, event);
    expect(await fetchPendingOutboxEvents(client)).toHaveLength(1);
    await markOutboxEventProcessed(client, event.id);
    await markOutboxEventFailed(client, event.id);
    await cleanupOutbox(client, { olderThanDays: 1 });
    await replayOutbox(client, () => undefined, { limit: 1 });

    expect(queries.join("\n")).toContain("stalezero_outbox");
  });
});
