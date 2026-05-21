import type { EventBus, StaleEvent } from "@stalezero/core";
import { createHmac, timingSafeEqual } from "node:crypto";

export type HttpBusOptions = {
  name?: string;
  endpoints: string[];
  fetch?: typeof fetch;
  headers?: Record<string, string>;
  timeoutMs?: number;
  signingSecret?: string;
  timestampToleranceMs?: number;
};

export type HttpBusHandlerOptions = {
  signingSecret?: string;
  timestampToleranceMs?: number;
  dedupeTtlMs?: number;
};

export function httpWebhookBus(options: HttpBusOptions): EventBus {
  return {
    name: options.name ?? "http-webhook",
    publish: async (event) => {
      const body = JSON.stringify(event);
      const timestamp = String(Date.now());
      await Promise.all(
        options.endpoints.map(async (endpoint) => {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 5000);
          try {
            const response = await (options.fetch ?? fetch)(endpoint, {
              method: "POST",
              headers: {
                "content-type": "application/json",
                "idempotency-key": event.id,
                "stalezero-event-id": event.id,
                "stalezero-timestamp": timestamp,
                ...(options.signingSecret ? { "stalezero-signature": signBody(body, timestamp, options.signingSecret) } : {}),
                ...options.headers
              },
              body,
              signal: controller.signal
            });
            if (!response.ok) {
              throw new Error(`HTTP bus endpoint ${endpoint} returned ${response.status}`);
            }
          } finally {
            clearTimeout(timeout);
          }
        })
      );
    },
    subscribe: () => {
      throw new Error("HTTP webhook bus receives events through createHttpBusHandler()");
    }
  };
}

export function createHttpBusHandler(handler: (event: StaleEvent) => Promise<void> | void, options: HttpBusHandlerOptions = {}) {
  const seen = new Map<string, number>();
  return async (request: Request): Promise<Response> => {
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }
    const body = await request.text();
    if (options.signingSecret) {
      verifySignature(request, body, options.signingSecret, options);
    }
    const event = JSON.parse(body) as StaleEvent;
    pruneSeen(seen, options.dedupeTtlMs ?? 300_000);
    if (seen.has(event.id)) {
      return new Response(JSON.stringify({ ok: true, id: event.id, duplicate: true }), {
        headers: { "content-type": "application/json" }
      });
    }
    seen.set(event.id, Date.now());
    await handler({ ...event, hops: event.hops + 1 });
    return new Response(JSON.stringify({ ok: true, id: event.id }), {
      headers: { "content-type": "application/json" }
    });
  };
}

function signBody(body: string, timestamp: string, secret: string): string {
  const digest = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  return `sha256=${digest}`;
}

function verifySignature(request: Request, body: string, signingSecret: string, options: HttpBusHandlerOptions): void {
  const timestamp = request.headers.get("stalezero-timestamp");
  const signature = request.headers.get("stalezero-signature");
  if (!timestamp || !signature) {
    throw new Error("Missing HTTP bus signature headers");
  }
  const tolerance = options.timestampToleranceMs ?? 300_000;
  const age = Math.abs(Date.now() - Number(timestamp));
  if (!Number.isFinite(age) || age > tolerance) {
    throw new Error("HTTP bus signature timestamp is outside tolerance");
  }
  const expected = signBody(body, timestamp, signingSecret);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    throw new Error("Invalid HTTP bus signature");
  }
}

function pruneSeen(seen: Map<string, number>, ttlMs: number): void {
  const cutoff = Date.now() - ttlMs;
  for (const [id, timestamp] of seen) {
    if (timestamp < cutoff) {
      seen.delete(id);
    }
  }
}
