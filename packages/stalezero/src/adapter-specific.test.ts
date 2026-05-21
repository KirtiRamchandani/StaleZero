import { describe, expect, it, vi } from "vitest";
import {
  apolloAdapter,
  cloudflareKvAdapter,
  createStaleZero,
  graphqlAdapter,
  httpAdapter,
  nextCacheAdapter,
  reactQueryAdapter,
  redisAdapter,
  reduxAdapter,
  rtkQueryAdapter,
  searchAdapter,
  swrAdapter,
  target,
  trpcAdapter,
  websocketAdapter,
  zustandAdapter,
  type MutationContext
} from "./index.js";

const context: MutationContext = {
  id: "receipt-1",
  mutation: "ProductUpdated",
  input: { productId: "p1", token: "hidden" },
  affected: [{ type: "Product", id: "p1" }],
  timestamp: 1,
  dryRun: false
};

describe("adapter-specific contracts", () => {
  it("redis deletes keys, guards unsafe patterns, and surfaces connection failures", async () => {
    const del = vi.fn();
    await redisAdapter({ del }).execute(target("redis", "product:p1", "delete"), context);
    expect(del).toHaveBeenCalledWith("product:p1");

    await expect(redisAdapter({ del, scanIterator: async function* () {} }).execute(target("redis", "*", "delete", { meta: { pattern: true } }), context)).rejects.toThrow("Unsafe Redis pattern");
    await expect(redisAdapter({ del: () => { throw new Error("offline"); } }).execute(target("redis", "product:p1", "delete"), context)).rejects.toThrow("offline");
  });

  it("react query invalidates keys and rejects missing or unsupported operations", async () => {
    const invalidateQueries = vi.fn();
    await reactQueryAdapter({ invalidateQueries }).execute(target("query", JSON.stringify(["product", "p1"]), "invalidate", { meta: { queryKey: ["product", "p1"] } }), context);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["product", "p1"], exact: false, predicate: undefined });

    await expect(reactQueryAdapter({}).execute(target("query", "[]", "invalidate", { meta: { queryKey: [] } }), context)).rejects.toThrow("invalidateQueries");
    await expect(reactQueryAdapter({ invalidateQueries }).execute(target("query", "[]", "custom", { meta: { queryKey: [] } }), context)).rejects.toThrow("does not support custom");
  });

  it("swr calls mutate through direct and global mutate paths", async () => {
    const mutate = vi.fn();
    await swrAdapter(mutate).execute(target("swr", "/api/products/p1", "revalidate"), context);
    expect(mutate).toHaveBeenCalledWith("/api/products/p1", undefined, { revalidate: true });

    (globalThis as unknown as { mutate?: unknown }).mutate = mutate;
    await swrAdapter().execute(target("swr", "/api/products/p2", "patch", { meta: { data: { price: 11 } } }), context);
    expect(mutate).toHaveBeenLastCalledWith("/api/products/p2", { price: 11 }, { revalidate: true });
    delete (globalThis as unknown as { mutate?: unknown }).mutate;

    await expect(swrAdapter().execute(target("swr", "/api/products/p3", "custom"), context)).rejects.toThrow("mutate");
  });

  it("redux and RTK Query dispatch clear invalidation payloads", async () => {
    const dispatch = vi.fn();
    await reduxAdapter({ dispatch }).execute(target("redux", "products.byId.p1", "invalidate"), context);
    expect(dispatch).toHaveBeenCalledWith({ type: "stalezero/invalidate", payload: { path: "products.byId.p1", mutation: "ProductUpdated" } });

    const api = { util: { invalidateTags: (tags: unknown[]) => ({ type: "invalidateTags", payload: tags }) } };
    await rtkQueryAdapter({ api, store: { dispatch } }).execute(target("rtk-query", "Product:p1", "invalidate", { meta: { tags: ["Product:p1"] } }), context);
    expect(dispatch).toHaveBeenLastCalledWith({ type: "invalidateTags", payload: ["Product:p1"] });
  });

  it("next rejects client execution unless explicitly allowed", async () => {
    const revalidateTag = vi.fn();
    (globalThis as unknown as { window?: unknown }).window = {};
    await expect(nextCacheAdapter({ revalidateTag }).execute(target("next", "product:p1", "revalidate", { meta: { kind: "tag" } }), context)).rejects.toThrow("server");
    delete (globalThis as unknown as { window?: unknown }).window;

    await nextCacheAdapter({ revalidateTag }).execute(target("next", "product:p1", "revalidate", { meta: { kind: "tag" } }), context);
    expect(revalidateTag).toHaveBeenCalledWith("product:p1");
  });

  it("zustand updates through custom setters and default path setters", async () => {
    const setter = vi.fn();
    const store = { getState: () => ({ products: {} }), setState: vi.fn() };
    await zustandAdapter(store, { setter }).execute(target("zustand", "products.p1", "patch"), context);
    expect(setter).toHaveBeenCalled();

    await zustandAdapter(store).execute(target("zustand", "products.p1", "patch", { meta: { value: { price: 12 } } }), context);
    expect(store.setState).toHaveBeenCalled();
  });

  it("apollo supports evict, modify, and refetch simulations", async () => {
    const evict = vi.fn();
    const modify = vi.fn();
    const refetchQueries = vi.fn();
    const adapter = apolloAdapter({ cache: { evict, modify }, refetchQueries });

    await adapter.execute(target("apollo", "Product:p1", "invalidate"), context);
    await adapter.execute(target("apollo", "Product:p1", "patch", { meta: { fields: { price: () => 12 } } }), context);
    await adapter.execute(target("apollo", "ProductQuery", "refetch", { meta: { include: ["ProductQuery"] } }), context);

    expect(evict).toHaveBeenCalled();
    expect(modify).toHaveBeenCalled();
    expect(refetchQueries).toHaveBeenCalledWith({ include: ["ProductQuery"] });
  });

  it("graphql routes entity and operation targets", async () => {
    const cache = { invalidate: vi.fn(), refetch: vi.fn(), evict: vi.fn() };
    const adapter = graphqlAdapter({ cache });

    await adapter.execute(target("graphql", "Product:p1", "invalidate"), context);
    await adapter.execute(target("graphql", "ProductQuery", "refetch"), context);
    await adapter.execute(target("graphql", "Product:p1", "delete"), context);

    expect(cache.invalidate).toHaveBeenCalled();
    expect(cache.refetch).toHaveBeenCalled();
    expect(cache.evict).toHaveBeenCalled();
  });

  it("cloudflare kv deletes keys and surfaces namespace failures", async () => {
    const namespace = { delete: vi.fn(async () => undefined) };
    await cloudflareKvAdapter({ namespace }).execute(target("cloudflare-kv", "product:p1", "delete"), context);
    expect(namespace.delete).toHaveBeenCalledWith("product:p1");

    await expect(cloudflareKvAdapter({ namespace: { delete: async () => { throw new Error("kv offline"); } } }).execute(target("cloudflare-kv", "product:p1", "delete"), context)).rejects.toThrow("kv offline");
  });

  it("websocket emits rooms, broadcasts clients, and fails without emitters", async () => {
    const emit = vi.fn();
    await websocketAdapter({ to: () => ({ emit }) }).execute(target("socket", "room:p1", "notify", { meta: { event: "changed" } }), context);
    expect(emit).toHaveBeenCalledWith("changed", expect.objectContaining({ receipt: "receipt-1" }));

    const send = vi.fn();
    await websocketAdapter({ clients: [{ readyState: 1, send }] }).execute(target("socket", "room:p1", "notify"), context);
    expect(send).toHaveBeenCalled();

    await expect(websocketAdapter({}).execute(target("socket", "room:p1", "notify"), context)).rejects.toThrow("No WebSocket emitter");
  });

  it("search enqueues reindex payloads", async () => {
    const enqueue = vi.fn();
    await searchAdapter({ queue: { enqueue } }).execute(target("search", "products:p1", "enqueue", { meta: { index: "products", id: "p1" } }), context);
    expect(enqueue).toHaveBeenCalledWith(expect.objectContaining({ operation: "reindex", index: "products", id: "p1" }));
  });

  it("http sends signed payloads and surfaces non-2xx responses", async () => {
    const fetcher = vi.fn(async () => new Response("ok"));
    await httpAdapter({ fetch: fetcher, signingSecret: "secret" }).execute(target("http", "https://example.test/hook", "publish"), context);
    expect(fetcher).toHaveBeenCalledWith("https://example.test/hook", expect.objectContaining({ headers: expect.objectContaining({ "x-stalezero-signature": expect.stringMatching(/^sha256=/) }) }));

    await expect(httpAdapter({ fetch: async () => new Response("no", { status: 500 }) }).execute(target("http", "https://example.test/hook", "publish"), context)).rejects.toThrow("500");
    await expect(httpAdapter({
      timeoutMs: 1,
      fetch: async (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
        })
    }).execute(target("http", "https://example.test/hook", "publish"), context)).rejects.toThrow("aborted");
  });

  it("trpc invokes utility methods and rejects missing procedures", async () => {
    const invalidate = vi.fn();
    await trpcAdapter({ utils: { product: { byId: { invalidate } } } }).execute(target("trpc", "product.byId", "invalidate"), context);
    expect(invalidate).toHaveBeenCalled();
    await expect(trpcAdapter({ utils: {} }).execute(target("trpc", "product.byId", "invalidate"), context)).rejects.toThrow("No tRPC utility");
  });

  it("engine modes surface adapter failures consistently", async () => {
    const stale = createStaleZero().use({
      name: "query",
      execute: () => {
        throw new Error("failed");
      }
    });

    const bestEffort = await stale.mutate("ModeCheck", {}).target(target("query", "[]", "invalidate")).run();
    expect(bestEffort.hasFailures()).toBe(true);
    await expect(stale.mutate("ModeCheck", {}).target(target("query", "[]", "invalidate")).run({ consistency: "strict" })).rejects.toThrow("finished with status failed");
  });
});
