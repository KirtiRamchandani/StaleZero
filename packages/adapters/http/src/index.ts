import { createHmac } from "node:crypto";
import type { Adapter, MutationContext, TargetRef } from "@stalezero/core";

export type HttpAdapterOptions = {
  name?: string;
  fetch?: typeof fetch;
  headers?: Record<string, string>;
  timeoutMs?: number;
  signingSecret?: string;
  logResponse?: (response: Response, target: TargetRef<"http">, context: MutationContext) => void | Promise<void>;
};

export function httpAdapter(options: HttpAdapterOptions = {}): Adapter<TargetRef<"http">> {
  return {
    name: options.name ?? "http",
    execute: async (target, context) => {
      if (target.action !== "publish" && target.action !== "notify") {
        throw new Error(`HTTP adapter does not support ${target.action}`);
      }
      const fetcher = options.fetch ?? fetch;
      const body = JSON.stringify({
        mutation: context.mutation,
        input: context.input,
        affected: context.affected,
        receipt: context.id,
        target: target.key,
        meta: target.meta
      });
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), Number(target.meta?.timeoutMs ?? options.timeoutMs ?? 3000));
      const headers = {
        "content-type": "application/json",
        "idempotency-key": context.id,
        ...options.headers,
        ...(options.signingSecret ? { "x-stalezero-signature": sign(body, options.signingSecret) } : {})
      };

      try {
        const response = await fetcher(target.key, {
          method: String(target.meta?.method ?? "POST"),
          headers,
          body,
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`HTTP target returned ${response.status}`);
        }

        await options.logResponse?.(response, target, context);
      } finally {
        clearTimeout(timeout);
      }
    }
  };
}

function sign(body: string, secret: string): string {
  return `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
}
