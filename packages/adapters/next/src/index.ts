import type { Adapter, TargetRef } from "@stalezero/core";

export type NextCacheFunctions = {
  revalidateTag?: (tag: string) => void | Promise<void>;
  revalidatePath?: (path: string, type?: "page" | "layout") => void | Promise<void>;
  updateTag?: (tag: string) => void | Promise<void>;
};

export type NextCacheAdapterOptions = NextCacheFunctions & {
  name?: string;
  allowClient?: boolean;
};

export function nextCacheAdapter(options: NextCacheAdapterOptions = {}): Adapter<TargetRef<"next">> {
  return {
    name: options.name ?? "next",
    execute: async (target) => {
      if (!options.allowClient && typeof window !== "undefined") {
        throw new Error("Next cache revalidation must run on the server");
      }

      const kind = target.meta?.kind;
      if (target.action === "custom" && target.meta?.operation === "updateTag") {
        if (!options.updateTag) {
          throw new Error("updateTag() was not provided");
        }
        await options.updateTag(target.key);
        return;
      }

      if (target.action !== "revalidate") {
        throw new Error(`Next cache adapter does not support ${target.action}`);
      }

      if (kind === "path") {
        if (!options.revalidatePath) {
          throw new Error("revalidatePath() was not provided");
        }
        await options.revalidatePath(target.key, target.meta?.type as "page" | "layout" | undefined);
        return;
      }

      if (!options.revalidateTag) {
        throw new Error("revalidateTag() was not provided");
      }
      await options.revalidateTag(target.key);
    }
  };
}
