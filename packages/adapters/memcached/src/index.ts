import type { Adapter, TargetRef } from "@stalezero/core";

export type MemcachedClientLike = {
  delete?: (key: string) => Promise<unknown> | unknown;
  del?: (key: string) => Promise<unknown> | unknown;
  touch?: (key: string, ttlSeconds: number) => Promise<unknown> | unknown;
};

export type MemcachedAdapterOptions = {
  name?: string;
  prefix?: string;
};

export function memcachedAdapter(client: MemcachedClientLike, options: MemcachedAdapterOptions = {}): Adapter<TargetRef<"memcached">> {
  const name = options.name ?? "memcached";

  return {
    name,
    execute: async (target, context) => {
      const key = withPrefix(options.prefix, target.key);

      if (target.action !== "delete" && target.action !== "remove" && target.action !== "invalidate") {
        throw new Error(`Memcached adapter does not support ${target.action}`);
      }

      if (typeof target.meta?.ttlSeconds === "number") {
        if (!client.touch) {
          throw new Error("Memcached client does not expose touch()");
        }
        await withAbortSignal(context.signal, () => client.touch!(key, target.meta!.ttlSeconds as number));
        return;
      }

      const deleter = client.delete ?? client.del;
      if (!deleter) {
        throw new Error("Memcached client does not expose delete() or del()");
      }

      await withAbortSignal(context.signal, () => deleter.call(client, key));
    }
  };
}

function withPrefix(prefix: string | undefined, key: string): string {
  if (!prefix || key.startsWith(prefix)) {
    return key;
  }
  return `${prefix}${key}`;
}

async function withAbortSignal<T>(signal: AbortSignal | undefined, fn: () => Promise<T> | T): Promise<T> {
  if (signal?.aborted) {
    throw signal.reason ?? new Error("Aborted");
  }

  let onAbort: (() => void) | undefined;
  const run = Promise.resolve(fn());

  if (!signal) {
    return run;
  }

  const aborted = new Promise<never>((_, reject) => {
    onAbort = () => reject(signal.reason ?? new Error("Aborted"));
    signal.addEventListener("abort", onAbort, { once: true });
  });

  try {
    return await Promise.race([run, aborted]);
  } finally {
    if (onAbort) {
      signal.removeEventListener("abort", onAbort);
    }
  }
}
