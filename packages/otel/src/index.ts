import type { Receipt, StaleZeroHooks } from "@stalezero/core";

export type SpanLike = {
  setAttribute: (name: string, value: string | number | boolean) => unknown;
  setStatus?: (status: { code: number; message?: string }) => unknown;
  recordException?: (error: Error) => unknown;
  addEvent?: (name: string, attributes?: Record<string, unknown>) => unknown;
  end?: () => unknown;
};

export const spanNames = {
  mutation: (mutation: string) => `stalezero.mutation.${mutation}`,
  adapter: "stalezero.adapter"
} as const;

export const eventNames = {
  receiptCreated: "stalezero.receipt.created",
  adapterResult: "stalezero.adapter.result"
} as const;

export function receiptAttributes(receipt: Receipt): Record<string, string | number | boolean> {
  return {
    "stalezero.receipt.id": receipt.id,
    "stalezero.mutation": receipt.mutation,
    "stalezero.status": receipt.status,
    "stalezero.duration_ms": receipt.durationMs,
    "stalezero.targets": receipt.targets.length,
    "stalezero.failures": receipt.results.filter((result) => result.status === "failed").length
  };
}

export function applyReceiptToSpan(span: SpanLike, receipt: Receipt): void {
  for (const [key, value] of Object.entries(receiptAttributes(receipt))) {
    span.setAttribute(key, value);
  }

  if (receipt.hasFailures()) {
    span.setStatus?.({ code: 2, message: receipt.status });
    for (const result of receipt.results) {
      if (result.error) {
        span.recordException?.(new Error(`${result.adapter}:${result.key} ${result.error.message}`));
      }
    }
  } else {
    span.setStatus?.({ code: 1 });
  }
}

export type TracerLike = {
  startSpan: (name: string, options?: { attributes?: Record<string, string | number | boolean> }) => SpanLike;
};

export function createOpenTelemetryHooks(tracer: TracerLike): StaleZeroHooks {
  return {
    onReceipt: ({ receipt }) => {
      const span = tracer.startSpan(spanNames.mutation(receipt.mutation), { attributes: receiptAttributes(receipt) });
      applyReceiptToSpan(span, receipt);
      span.addEvent?.(eventNames.receiptCreated, {
        "stalezero.receipt.id": receipt.id,
        "stalezero.targets": receipt.targets.length,
        "stalezero.failures": receipt.results.filter((result) => result.status === "failed").length
      });
      for (const result of receipt.results) {
        const adapterSpan = tracer.startSpan(spanNames.adapter, {
          attributes: {
            "stalezero.receipt.id": receipt.id,
            "stalezero.mutation": receipt.mutation,
            "stalezero.adapter": result.adapter,
            "stalezero.target.key": result.key,
            "stalezero.target.action": result.action,
            "stalezero.adapter.status": result.status,
            "stalezero.adapter.duration_ms": result.durationMs,
            "stalezero.adapter.attempts": result.attempts
          }
        });
        adapterSpan.addEvent?.(eventNames.adapterResult, {
          "stalezero.adapter": result.adapter,
          "stalezero.target.key": result.key,
          "stalezero.adapter.status": result.status
        });
        if (result.error) {
          adapterSpan.setStatus?.({ code: 2, message: result.error.message });
          adapterSpan.recordException?.(new Error(`${result.adapter}:${result.key} ${result.error.message}`));
        } else {
          adapterSpan.setStatus?.({ code: 1 });
        }
        adapterSpan.end?.();
      }
      span.end?.();
    }
  };
}
