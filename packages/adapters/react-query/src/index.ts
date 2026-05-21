import type { Adapter, TargetRef } from "@stalezero/core";

export type QueryClientLike = {
  invalidateQueries?: (filters?: unknown) => Promise<unknown> | unknown;
  refetchQueries?: (filters?: unknown) => Promise<unknown> | unknown;
  removeQueries?: (filters?: unknown) => void;
  setQueryData?: (queryKey: unknown, updater: unknown) => unknown;
};

export type ReactQueryAdapterOptions = {
  name?: string;
  defaultExact?: boolean;
};

export function reactQueryAdapter(client: QueryClientLike, options: ReactQueryAdapterOptions = {}): Adapter<TargetRef<"query">> {
  return {
    name: options.name ?? "query",
    execute: async (target) => {
      const queryKey = target.meta?.queryKey ?? JSON.parse(target.key);
      const filters = {
        queryKey,
        exact: target.meta?.exact ?? options.defaultExact ?? false,
        predicate: target.meta?.predicate
      };

      if (target.action === "refetch") {
        if (!client.refetchQueries) {
          throw new Error("Query client does not expose refetchQueries()");
        }
        await client.refetchQueries(filters);
        return;
      }

      if (target.action === "remove") {
        if (!client.removeQueries) {
          throw new Error("Query client does not expose removeQueries()");
        }
        client.removeQueries(filters);
        return;
      }

      if (target.action === "patch") {
        if (!client.setQueryData) {
          throw new Error("Query client does not expose setQueryData()");
        }
        client.setQueryData(queryKey, target.meta?.updater ?? target.meta?.value);
        return;
      }

      if (target.action !== "invalidate") {
        throw new Error(`React Query adapter does not support ${target.action}`);
      }

      if (!client.invalidateQueries) {
        throw new Error("Query client does not expose invalidateQueries()");
      }
      await client.invalidateQueries(filters);
    }
  };
}
