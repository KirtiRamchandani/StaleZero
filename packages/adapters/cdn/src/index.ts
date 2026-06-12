import type { Adapter, MutationContext, TargetRef } from "@stalezero/core";

export type CdnAdapterOptions = {
  name?: string;
  fetch?: typeof fetch;
  headers?: Record<string, string>;
  timeoutMs?: number;
  purgeUrls?: Record<string, string>;
  resolvePurgeUrl?: (target: TargetRef<"cdn">, context: MutationContext) => string | undefined;
};

export function cdnAdapter(options: CdnAdapterOptions = {}): Adapter<TargetRef<"cdn">> {
  return {
    name: options.name ?? "cdn",
    execute: async (target, context) => {
      if (target.action !== "purge") {
        throw new Error(`CDN adapter does not support ${target.action}`);
      }

      const url = resolvePurgeUrl(target, context, options);
      if (!url) {
        throw new Error("CDN purge URL could not be resolved");
      }

      const fetcher = options.fetch ?? fetch;
      const controller = new AbortController();
      const timeoutMs = Number(target.meta?.timeoutMs ?? options.timeoutMs ?? 10_000);
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      const onContextAbort = () => controller.abort(context.signal?.reason);
      context.signal?.addEventListener("abort", onContextAbort, { once: true });

      const method = String(target.meta?.method ?? "POST");
      const provider = String(target.meta?.provider ?? target.key.split(":")[0] ?? "");
      const purgeKey = String(target.meta?.key ?? target.key.split(":").slice(1).join(":") ?? target.key);
      const body =
        target.meta?.body !== undefined
          ? String(target.meta.body)
          : JSON.stringify({
              mutation: context.mutation,
              receipt: context.id,
              provider,
              key: purgeKey,
              target: target.key,
              meta: target.meta
            });

      const headers = {
        ...(method !== "GET" ? { "content-type": "application/json" } : {}),
        "idempotency-key": context.id,
        ...options.headers,
        ...(isRecord(target.meta?.headers) ? (target.meta.headers as Record<string, string>) : {})
      };

      try {
        const response = await fetcher(url, {
          method,
          headers,
          body: method === "GET" ? undefined : body,
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`CDN purge returned ${response.status}`);
        }
      } finally {
        clearTimeout(timeout);
        context.signal?.removeEventListener("abort", onContextAbort);
      }
    }
  };
}

function resolvePurgeUrl(target: TargetRef<"cdn">, context: MutationContext, options: CdnAdapterOptions): string | undefined {
  if (typeof target.meta?.url === "string" && target.meta.url.length > 0) {
    return target.meta.url;
  }

  const resolved = options.resolvePurgeUrl?.(target, context);
  if (resolved) {
    return resolved;
  }

  const provider = String(target.meta?.provider ?? target.key.split(":")[0] ?? "");
  const template = options.purgeUrls?.[provider];
  if (!template) {
    return undefined;
  }

  const purgeKey = String(target.meta?.key ?? target.key.split(":").slice(1).join(":") ?? target.key);
  return template.replaceAll("{provider}", provider).replaceAll("{key}", purgeKey).replaceAll("{target}", target.key);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
