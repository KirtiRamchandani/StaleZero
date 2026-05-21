import { describe, expect, it, vi } from "vitest";
import { createHttpBusHandler, httpWebhookBus } from "./index.js";
import type { StaleEvent } from "@stalezero/core";

const event: StaleEvent = {
  id: "event-1",
  mutation: "ProductUpdated",
  input: { productId: "p1" },
  affected: [{ type: "Product", id: "p1" }],
  timestamp: 1,
  hops: 0
};

describe("HTTP bus", () => {
  it("publishes signed events and verifies them in the handler", async () => {
    const received: StaleEvent[] = [];
    const handler = createHttpBusHandler((next) => {
      received.push(next);
    }, { signingSecret: "secret" });
    const fetcher = vi.fn(async (url: string | URL | Request, init?: RequestInit) =>
      handler(new Request(String(url), init))
    );

    await httpWebhookBus({ endpoints: ["https://example.test/events"], fetch: fetcher, signingSecret: "secret" }).publish(event);

    expect(fetcher).toHaveBeenCalled();
    expect(received).toEqual([{ ...event, hops: 1 }]);
  });

  it("dedupes repeated event IDs", async () => {
    const calls: string[] = [];
    const handler = createHttpBusHandler((next) => {
      calls.push(next.id);
    });

    await handler(new Request("https://example.test/events", { method: "POST", body: JSON.stringify(event) }));
    const duplicate = await handler(new Request("https://example.test/events", { method: "POST", body: JSON.stringify(event) }));

    expect(calls).toEqual(["event-1"]);
    expect(await duplicate.json()).toMatchObject({ duplicate: true });
  });

  it("rejects replayed or unsigned events when signing is required", async () => {
    const handler = createHttpBusHandler(() => undefined, { signingSecret: "secret" });

    await expect(handler(new Request("https://example.test/events", { method: "POST", body: JSON.stringify(event) }))).rejects.toThrow("signature");
  });
});
