import { entity, nextPathTarget, nextTagTarget, queryTarget, redisTarget, searchTarget, socketTarget, type StaleZero } from "@stalezero/core";

type Recipe = (stale: StaleZero) => void;

export type ProductCatalogRecipeOptions = {
  redisPrefix?: string;
  queryKey?: (id: string) => unknown[];
  nextTag?: (id: string) => string;
  searchIndex?: string;
};

export type UserProfileRecipeOptions = {
  redisPrefix?: string;
  queryKey?: (id: string) => unknown[];
  nextTag?: (id: string) => string;
};

export const recipe = {
  userProfile(options: UserProfileRecipeOptions = {}): Recipe {
    return (stale) => {
      stale.mutation("UserUpdated", {
        affects: (input: { userId: string }) => [entity("User", input.userId)]
      });
      stale.mirror("UserRedis", {
        when: "UserUpdated",
        target: (input: { userId: string }) => redisTarget(`${options.redisPrefix ?? "user:"}${input.userId}`)
      });
      stale.mirror("UserQuery", {
        when: "UserUpdated",
        target: (input: { userId: string }) => queryTarget(options.queryKey?.(input.userId) ?? ["user", input.userId])
      });
      stale.mirror("UserNext", {
        when: "UserUpdated",
        target: (input: { userId: string }) => nextTagTarget(options.nextTag?.(input.userId) ?? `user:${input.userId}`)
      });
    };
  },

  productCatalog(options: ProductCatalogRecipeOptions = {}): Recipe {
    return (stale) => {
      stale.mutation("ProductUpdated", {
        affects: (input: { productId: string }) => [entity("Product", input.productId)]
      });
      stale.mutation("ProductPriceChanged", {
        affects: (input: { productId: string }) => [entity("Product", input.productId)]
      });
      for (const mutation of ["ProductUpdated", "ProductPriceChanged"]) {
        stale.mirror(`${mutation}:redis`, {
          when: mutation,
          target: (input: { productId: string }) => redisTarget(`${options.redisPrefix ?? "product:"}${input.productId}`)
        });
        stale.mirror(`${mutation}:query`, {
          when: mutation,
          target: (input: { productId: string }) => queryTarget(options.queryKey?.(input.productId) ?? ["product", input.productId])
        });
        stale.mirror(`${mutation}:next`, {
          when: mutation,
          target: (input: { productId: string }) => nextTagTarget(options.nextTag?.(input.productId) ?? `product:${input.productId}`)
        });
        if (options.searchIndex) {
          stale.mirror(`${mutation}:search`, {
            when: mutation,
            target: (input: { productId: string }) => searchTarget(options.searchIndex!, input.productId)
          });
        }
      }
    };
  },

  stripeWebhook(): Recipe {
    return (stale) =>
      stale.resource("BillingPlan", {
        id: "customerId",
        cache: { prefix: "billing:" },
        query: { key: (id) => ["billing", id] },
        next: { tag: (id) => `billing:${id}` }
      });
  },

  orderLifecycle(): Recipe {
    return (stale) => {
      stale.resource("Order", {
        id: "orderId",
        cache: { prefix: "order:" },
        query: { key: (id) => ["order", id] },
        next: { tag: (id) => `order:${id}` },
        socket: { room: (id) => `order:${id}`, event: "order.changed" }
      });
    };
  },

  teamMembership(): Recipe {
    return (stale) => stale.resource("Team", { id: "teamId", cache: true, query: true, next: true, socket: true });
  },

  rolePermission(): Recipe {
    return (stale) => stale.resource("Role", { id: "roleId", cache: true, query: true, next: true });
  },

  searchReindex(index = "documents"): Recipe {
    return (stale) => {
      stale.mutation("SearchDocumentChanged", {
        affects: (input: { documentId: string }) => [entity("Document", input.documentId)],
        targets: (input: { documentId: string }) => [searchTarget(index, input.documentId)]
      });
    };
  },

  nextPageRevalidate(path = "/"): Recipe {
    return (stale) => {
      stale.mutation("PageDataChanged", {
        targets: () => [nextPathTarget(path)]
      });
    };
  }
};

export const template = {
  entityMutation(options: {
    entity: string;
    id: string;
    redis?: (input: Record<string, unknown>) => string;
    query?: (input: Record<string, unknown>) => unknown[];
    nextTag?: (input: Record<string, unknown>) => string;
    socket?: (input: Record<string, unknown>) => string;
  }) {
    return {
      affects: (input: Record<string, unknown>) => [entity(options.entity, String(input[options.id]))],
      targets: (input: Record<string, unknown>) => [
        ...(options.redis ? [redisTarget(options.redis(input))] : []),
        ...(options.query ? [queryTarget(options.query(input))] : []),
        ...(options.nextTag ? [nextTagTarget(options.nextTag(input))] : []),
        ...(options.socket ? [socketTarget(options.socket(input))] : [])
      ]
    };
  }
};
