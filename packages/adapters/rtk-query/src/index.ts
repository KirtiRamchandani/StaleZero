import type { Adapter, TargetRef } from "@stalezero/core";

export type RtkQueryApiLike = {
  util: {
    invalidateTags?: (tags: unknown[]) => unknown;
    prefetch?: (endpointName: string, arg: unknown, options?: unknown) => unknown;
    resetApiState?: () => unknown;
    updateQueryData?: (endpointName: string, arg: unknown, updateRecipe: (draft: unknown) => void) => unknown;
  };
};

export type RtkQueryStoreLike = {
  dispatch: (action: unknown) => unknown;
};

export type RtkQueryAdapterOptions = {
  name?: string;
  api: RtkQueryApiLike;
  store: RtkQueryStoreLike;
};

export type RtkQueryTargetOptions = Omit<TargetRef<"rtk-query">, "adapter" | "key" | "action"> & {
  endpoint?: string;
  arg?: unknown;
  tags?: unknown[];
};

export function rtkQueryAdapter(options: RtkQueryAdapterOptions): Adapter<TargetRef<"rtk-query">> {
  return {
    name: options.name ?? "rtk-query",
    execute: (target) => {
      const util = options.api.util;
      if (target.action === "refetch") {
        if (!util.prefetch) {
          throw new Error("RTK Query api.util.prefetch() is not available");
        }
        options.store.dispatch(util.prefetch(String(target.meta?.endpoint ?? target.key), target.meta?.arg, { force: true }));
        return;
      }

      if (target.action === "patch") {
        if (!util.updateQueryData) {
          throw new Error("RTK Query api.util.updateQueryData() is not available");
        }
        options.store.dispatch(
          util.updateQueryData(String(target.meta?.endpoint ?? target.key), target.meta?.arg, target.meta?.updateRecipe as (draft: unknown) => void)
        );
        return;
      }

      if (target.action === "remove") {
        if (!util.resetApiState) {
          throw new Error("RTK Query api.util.resetApiState() is not available");
        }
        options.store.dispatch(util.resetApiState());
        return;
      }

      if (target.action !== "invalidate") {
        throw new Error(`RTK Query adapter does not support ${target.action}`);
      }

      if (!util.invalidateTags) {
        throw new Error("RTK Query api.util.invalidateTags() is not available");
      }
      options.store.dispatch(util.invalidateTags((target.meta?.tags as unknown[] | undefined) ?? [target.key]));
    }
  };
}

export function rtkQueryTarget(tags: unknown[] | string, options: RtkQueryTargetOptions = {}): TargetRef<"rtk-query"> {
  const normalizedTags = Array.isArray(tags) ? tags : [tags];
  return {
    adapter: "rtk-query",
    key: normalizedTags.map((tag) => (typeof tag === "string" ? tag : JSON.stringify(tag))).join(","),
    action: "invalidate",
    ...options,
    meta: { ...options.meta, tags: options.tags ?? normalizedTags, endpoint: options.endpoint, arg: options.arg }
  };
}

export function rtkQueryEndpointTarget(endpoint: string, arg?: unknown, options: RtkQueryTargetOptions = {}): TargetRef<"rtk-query"> {
  return {
    adapter: "rtk-query",
    key: endpoint,
    action: "refetch",
    ...options,
    meta: { ...options.meta, endpoint, arg }
  };
}
