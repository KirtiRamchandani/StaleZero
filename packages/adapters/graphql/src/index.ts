import type { Adapter, MutationContext, TargetRef } from "@stalezero/core";

export type GraphqlCacheLike = {
  invalidate?: (target: GraphqlTarget, context: MutationContext) => Promise<unknown> | unknown;
  refetch?: (target: GraphqlTarget, context: MutationContext) => Promise<unknown> | unknown;
  evict?: (target: GraphqlTarget, context: MutationContext) => Promise<unknown> | unknown;
};

export type GraphqlTarget = TargetRef<"graphql"> & {
  meta?: {
    operation?: string;
    entity?: string;
    id?: string;
    variables?: Record<string, unknown>;
    [key: string]: unknown;
  };
};

export type GraphqlAdapterOptions = {
  name?: string;
  cache: GraphqlCacheLike;
};

export function graphqlAdapter(options: GraphqlAdapterOptions): Adapter<GraphqlTarget> {
  return {
    name: options.name ?? "graphql",
    execute: async (target, context) => {
      if (target.action === "refetch") {
        if (!options.cache.refetch) {
          throw new Error("GraphQL cache does not expose refetch()");
        }
        await options.cache.refetch(target, context);
        return;
      }

      if (target.action === "remove" || target.action === "delete") {
        if (!options.cache.evict) {
          throw new Error("GraphQL cache does not expose evict()");
        }
        await options.cache.evict(target, context);
        return;
      }

      if (target.action !== "invalidate") {
        throw new Error(`GraphQL adapter does not support ${target.action}`);
      }

      if (!options.cache.invalidate) {
        throw new Error("GraphQL cache does not expose invalidate()");
      }
      await options.cache.invalidate(target, context);
    }
  };
}

export function graphqlTarget(
  operation: string,
  options: Omit<GraphqlTarget, "adapter" | "key" | "action"> & { action?: GraphqlTarget["action"] } = {}
): GraphqlTarget {
  return {
    adapter: "graphql",
    key: operation,
    action: options.action ?? "invalidate",
    ...options,
    meta: { ...options.meta, operation }
  };
}

export function graphqlEntityTarget(entity: string, id: string, options: Omit<GraphqlTarget, "adapter" | "key" | "action"> = {}): GraphqlTarget {
  return {
    adapter: "graphql",
    key: `${entity}:${id}`,
    action: "invalidate",
    ...options,
    meta: { ...options.meta, entity, id }
  };
}
