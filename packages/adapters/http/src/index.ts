import { createHmac } from "node:crypto";
import {
  assertSafeHttpMethod,
  assertSafeHttpUrl,
  httpSafetyOptionsFromTarget,
  type HttpSafetyOptions
} from "@stalezero/core";
import type { Adapter, MutationContext, TargetRef } from "@stalezero/core";

export type HttpAdapterOptions = {
  name?: string;
  fetch?: typeof fetch;
  headers?: Record<string, string>;
  timeoutMs?: number;
  signingSecret?: string;
  safety?: HttpSafetyOptions;
  logResponse?: (response: Response, target: TargetRef<"http">, context: MutationContext) => void | Promise<void>;
};

const MAX_REDIRECTS = 5;

export function httpAdapter(options: HttpAdapterOptions = {}): Adapter<TargetRef<"http">> {
  return {
    name: options.name ?? "http",
    execute: async (target, context) => {
      if (target.action !== "publish" && target.action !== "notify") {
        throw new Error(`HTTP adapter does not support ${target.action}`);
      }

      const safety = { ...options.safety, ...httpSafetyOptionsFromTarget(target) };
      const method = String(target.meta?.method ?? "POST");
      assertSafeHttpMethod(method, safety);

      const body = JSON.stringify({
        mutation: context.mutation,
        input: context.input,
        affected: context.affected,
        receipt: context.id,
        target: target.key,
        meta: target.meta
      });

      if (safety.maxBodyBytes !== undefined && body.length > safety.maxBodyBytes) {
        throw new Error(`HTTP body exceeds maxBodyBytes (${safety.maxBodyBytes})`);
      }

      const fetcher = options.fetch ?? fetch;
      const controller = new AbortController();
      const timeoutMs = Number(target.meta?.timeoutMs ?? options.timeoutMs ?? 3000);
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      const onContextAbort = () => controller.abort(context.signal?.reason);
      context.signal?.addEventListener("abort", onContextAbort, { once: true });

      const headers = {
        "content-type": "application/json",
        "idempotency-key": context.id,
        ...options.headers,
        ...(options.signingSecret ? { "x-stalezero-signature": sign(body, options.signingSecret) } : {})
      };

      try {
        const response = await safeFetch(fetcher, target.key, {
          method,
          headers,
          body,
          signal: controller.signal
        }, safety);

        if (!response.ok) {
          throw new Error(`HTTP target returned ${response.status}`);
        }

        if (safety.maxResponseBytes !== undefined) {
          const clone = response.clone();
          const text = await clone.text();
          if (text.length > safety.maxResponseBytes) {
            throw new Error(`HTTP response exceeds maxResponseBytes (${safety.maxResponseBytes})`);
          }
        }

        await options.logResponse?.(response, target, context);
      } finally {
        clearTimeout(timeout);
        context.signal?.removeEventListener("abort", onContextAbort);
      }
    }
  };
}

async function safeFetch(
  fetcher: typeof fetch,
  urlString: string,
  init: RequestInit,
  safety: HttpSafetyOptions
): Promise<Response> {
  let current = assertSafeHttpUrl(urlString, safety).toString();

  for (let hop = 0; hop < MAX_REDIRECTS; hop += 1) {
    const response = await fetcher(current, { ...init, redirect: "manual" });
    if (response.status < 300 || response.status >= 400) {
      return response;
    }
    const location = response.headers.get("location");
    if (!location) {
      throw new Error(`HTTP redirect from ${current} is missing a location header`);
    }
    current = new URL(location, current).toString();
    assertSafeHttpUrl(current, safety);
  }

  throw new Error(`HTTP redirect chain exceeded ${MAX_REDIRECTS} hops`);
}

function sign(body: string, secret: string): string {
  return `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
}
