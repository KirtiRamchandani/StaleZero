import type { Adapter, TargetRef } from "@stalezero/core";

export type TrpcUtilsLike = Record<string, unknown>;

export type TrpcAdapterOptions = {
  name?: string;
  utils: TrpcUtilsLike;
};

export type TrpcTargetOptions = Omit<TargetRef<"trpc">, "adapter" | "key" | "action"> & {
  path?: string | string[];
  input?: unknown;
};

export function trpcAdapter(options: TrpcAdapterOptions): Adapter<TargetRef<"trpc">> {
  return {
    name: options.name ?? "trpc",
    execute: async (target) => {
      const path = Array.isArray(target.meta?.path) ? target.meta.path : String(target.meta?.path ?? target.key).split(".");
      const procedure = getPath(options.utils, path);
      if (!procedure || typeof procedure !== "object") {
        throw new Error(`No tRPC utility found for ${path.join(".")}`);
      }

      if (target.action !== "invalidate" && target.action !== "refetch" && target.action !== "remove") {
        throw new Error(`tRPC adapter does not support ${target.action}`);
      }

      const method = target.action === "refetch" ? "refetch" : target.action === "remove" ? "cancel" : "invalidate";
      const callable = (procedure as Record<string, unknown>)[method];
      if (typeof callable !== "function") {
        throw new Error(`tRPC utility ${path.join(".")} does not expose ${method}()`);
      }
      await callable.call(procedure, target.meta?.input);
    }
  };
}

export function trpcTarget(path: string | string[], options: TrpcTargetOptions = {}): TargetRef<"trpc"> {
  const key = Array.isArray(path) ? path.join(".") : path;
  return {
    adapter: "trpc",
    key,
    action: (options.meta?.action as TargetRef["action"] | undefined) ?? "invalidate",
    ...options,
    meta: { ...options.meta, path, input: options.input }
  };
}

function getPath(root: TrpcUtilsLike, path: string[]): unknown {
  return path.reduce<unknown>((cursor, part) => {
    if (!cursor || typeof cursor !== "object") {
      return undefined;
    }
    return (cursor as Record<string, unknown>)[part];
  }, root);
}
