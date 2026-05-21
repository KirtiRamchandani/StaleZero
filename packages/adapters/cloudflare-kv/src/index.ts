import type { Adapter, TargetRef } from "@stalezero/core";

export type KvNamespaceLike = {
  delete: (key: string) => Promise<void>;
  put?: (key: string, value: string | ArrayBuffer | ArrayBufferView | ReadableStream, options?: unknown) => Promise<void>;
  list?: (options?: { prefix?: string; cursor?: string }) => Promise<{ keys: Array<{ name: string }>; cursor?: string; list_complete?: boolean }>;
};

export type CloudflareKvAdapterOptions = {
  name?: string;
  namespace: KvNamespaceLike;
  prefix?: string;
  maxPatternDeletes?: number;
};

export function cloudflareKvAdapter(options: CloudflareKvAdapterOptions): Adapter<TargetRef<"cloudflare-kv">> {
  return {
    name: options.name ?? "cloudflare-kv",
    execute: async (target) => {
      const key = `${options.prefix ?? ""}${target.key}`;
      if (target.action === "patch") {
        if (!options.namespace.put) {
          throw new Error("KV namespace does not expose put()");
        }
        await options.namespace.put(key, String(target.meta?.value ?? ""), target.meta?.putOptions);
        return;
      }

      if (target.action !== "delete" && target.action !== "remove") {
        throw new Error(`Cloudflare KV adapter does not support ${target.action}`);
      }

      if (target.meta?.pattern === true) {
        if (!options.namespace.list) {
          throw new Error("KV pattern deletion requires list()");
        }
        assertSafePrefix(key);
        let cursor: string | undefined;
        let deleted = 0;
        do {
          const page = await options.namespace.list({ prefix: key.replace(/\*$/, ""), cursor });
          for (const item of page.keys) {
            deleted += 1;
            if (deleted > (options.maxPatternDeletes ?? 1000)) {
              throw new Error("KV pattern deletion exceeded maxPatternDeletes");
            }
            await options.namespace.delete(item.name);
          }
          cursor = page.cursor;
          if (page.list_complete) {
            cursor = undefined;
          }
        } while (cursor);
        return;
      }

      await options.namespace.delete(key);
    }
  };
}

export function kvTarget(key: string, options: Omit<TargetRef<"cloudflare-kv">, "adapter" | "key" | "action"> = {}): TargetRef<"cloudflare-kv"> {
  return { adapter: "cloudflare-kv", key, action: "delete", ...options };
}

export function kvPrefixTarget(prefix: string, options: Omit<TargetRef<"cloudflare-kv">, "adapter" | "key" | "action"> = {}): TargetRef<"cloudflare-kv"> {
  return { adapter: "cloudflare-kv", key: prefix.endsWith("*") ? prefix : `${prefix}*`, action: "delete", ...options, meta: { ...options.meta, pattern: true } };
}

function assertSafePrefix(prefix: string): void {
  const clean = prefix.replace(/\*$/, "");
  if (clean.length < 3) {
    throw new Error(`Unsafe KV prefix: ${prefix}`);
  }
}
