import { describe, expect, it, vi } from "vitest";
import { createReceipt } from "@stalezero/core";
import { createOpenTelemetryHooks, eventNames, receiptAttributes, spanNames } from "./index.js";

describe("OpenTelemetry hooks", () => {
  it("sets receipt attributes and creates per-adapter spans", async () => {
    const spans: Array<{ name: string; attributes?: Record<string, unknown>; events: string[]; end: () => void; setAttribute: (name: string, value: unknown) => void; setStatus: (status: unknown) => void; recordException: (error: Error) => void; addEvent: (name: string) => void }> = [];
    const tracer = {
      startSpan: vi.fn((name: string, options?: { attributes?: Record<string, unknown> }) => {
        const span = {
          name,
          attributes: options?.attributes,
          events: [] as string[],
          end: vi.fn(),
          setAttribute: vi.fn(),
          setStatus: vi.fn(),
          recordException: vi.fn(),
          addEvent: vi.fn((eventName: string) => span.events.push(eventName))
        };
        spans.push(span);
        return span;
      })
    };
    const receipt = createReceipt({
      id: "receipt-1",
      mutation: "ProductUpdated",
      payload: {},
      affected: [],
      targets: [{ adapter: "redis", key: "product:p1", action: "delete" }],
      results: [{ adapter: "redis", key: "product:p1", action: "delete", status: "success", durationMs: 2, attempts: 1, target: { adapter: "redis", key: "product:p1", action: "delete" } }],
      status: "success",
      durationMs: 3,
      timestamp: 1
    });

    await createOpenTelemetryHooks(tracer).onReceipt?.({ type: "receipt", receipt });

    expect(receiptAttributes(receipt)["stalezero.receipt.id"]).toBe("receipt-1");
    expect(spans.map((span) => span.name)).toEqual([spanNames.mutation("ProductUpdated"), spanNames.adapter]);
    expect(spans[0]?.events).toContain(eventNames.receiptCreated);
    expect(spans[1]?.events).toContain(eventNames.adapterResult);
  });
});
