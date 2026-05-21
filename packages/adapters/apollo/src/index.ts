import type { Adapter, TargetRef } from "@stalezero/core";

export type ApolloClientLike = {
  cache?: ApolloCacheLike;
  refetchQueries?: (options: unknown) => Promise<unknown> | unknown;
};

export type ApolloCacheLike = {
  evict?: (options: Record<string, unknown>) => boolean;
  modify?: (options: Record<string, unknown>) => boolean;
  identify?: (object: Record<string, unknown>) => string | undefined;
  gc?: () => unknown;
};

export type ApolloAdapterOptions = {
  name?: string;
  gcAfterEvict?: boolean;
};

export function apolloAdapter(client: ApolloClientLike, options: ApolloAdapterOptions = {}): Adapter<TargetRef<"apollo">> {
  return {
    name: options.name ?? "apollo",
    execute: async (target) => {
      const cache = client.cache;
      if (target.action === "refetch") {
        if (!client.refetchQueries) {
          throw new Error("Apollo client does not expose refetchQueries()");
        }
        await client.refetchQueries({ include: target.meta?.include ?? [target.key] });
        return;
      }

      if (!cache) {
        throw new Error("Apollo cache was not provided");
      }

      if (target.action === "patch") {
        if (!cache.modify) {
          throw new Error("Apollo cache does not expose modify()");
        }
        cache.modify({ id: identify(cache, target), fields: target.meta?.fields });
      } else if (target.action === "invalidate" || target.action === "remove" || target.action === "delete") {
        if (!cache.evict) {
          throw new Error("Apollo cache does not expose evict()");
        }
        cache.evict({ id: identify(cache, target), fieldName: target.meta?.fieldName });
      } else {
        throw new Error(`Apollo adapter does not support ${target.action}`);
      }

      if (options.gcAfterEvict && cache.gc) {
        cache.gc();
      }
    }
  };
}

function identify(cache: ApolloCacheLike, target: TargetRef<"apollo">): string | undefined {
  if (target.meta?.id && typeof target.meta.id === "string") {
    return target.meta.id;
  }
  if (target.meta?.object && typeof target.meta.object === "object" && cache.identify) {
    return cache.identify(target.meta.object as Record<string, unknown>);
  }
  return target.key;
}
