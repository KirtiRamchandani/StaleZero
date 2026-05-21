import type { Adapter, TargetRef } from "@stalezero/core";

export type SwrMutateLike = (key: unknown, data?: unknown, options?: unknown) => Promise<unknown> | unknown;

export type SwrAdapterOptions = {
  name?: string;
  mutate?: SwrMutateLike;
  revalidate?: boolean;
};

export function swrAdapter(mutateOrOptions?: SwrMutateLike | SwrAdapterOptions): Adapter<TargetRef<"swr">> {
  const options: SwrAdapterOptions = typeof mutateOrOptions === "function" ? { mutate: mutateOrOptions } : (mutateOrOptions ?? {});

  return {
    name: options.name ?? "swr",
    execute: async (target) => {
      const mutate = options.mutate ?? globalThisMutate();
      if (!mutate) {
        throw new Error("SWR mutate() was not provided");
      }

      const key = target.meta?.filter ?? target.key;
      if (target.action === "patch") {
        await mutate(key, target.meta?.data, { revalidate: target.meta?.revalidate ?? options.revalidate ?? true });
        return;
      }

      if (target.action !== "revalidate" && target.action !== "invalidate" && target.action !== "refetch") {
        throw new Error(`SWR adapter does not support ${target.action}`);
      }

      await mutate(key, undefined, { revalidate: target.meta?.revalidate ?? options.revalidate ?? true });
    }
  };
}

function globalThisMutate(): SwrMutateLike | undefined {
  const candidate = (globalThis as Record<string, unknown>).mutate;
  return typeof candidate === "function" ? (candidate as SwrMutateLike) : undefined;
}
