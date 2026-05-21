import {
  createStaleZero,
  entity,
  memoryAdapter,
  nextTagTarget,
  queryTarget,
  redisTarget,
  searchTarget,
  socketTarget,
  swrTarget
} from "stalezero";

const memory = memoryAdapter("redis");

const stale = createStaleZero({
  app: "storefront",
  receipts: {
    redact: ["email", "token"]
  }
});

stale.use(memory);
stale.use({
  name: "query",
  execute: (target) => memory.calls.push({ target, context: undefined as never })
});
stale.use({
  name: "swr",
  execute: (target) => memory.calls.push({ target, context: undefined as never })
});
stale.use({
  name: "next",
  execute: (target) => memory.calls.push({ target, context: undefined as never })
});
stale.use({
  name: "search",
  execute: (target) => memory.calls.push({ target, context: undefined as never })
});
stale.use({
  name: "socket",
  execute: (target) => memory.calls.push({ target, context: undefined as never })
});

stale.mutation("ProductPriceChanged", {
  affects: ({ productId, categoryId }: { productId: string; categoryId: string }) => [
    entity("Product", productId),
    entity("Category", categoryId)
  ]
});

stale.mirror("RedisProduct", {
  when: "ProductPriceChanged",
  target: ({ productId }: { productId: string }) => redisTarget(`product:${productId}`)
});

stale.mirror("ProductQuery", {
  when: "ProductPriceChanged",
  target: ({ productId }: { productId: string }) => queryTarget(["product", productId])
});

stale.mirror("ProductApi", {
  when: "ProductPriceChanged",
  target: ({ productId }: { productId: string }) => swrTarget(`/api/products/${productId}`)
});

stale.mirror("ProductPage", {
  when: "ProductPriceChanged",
  target: ({ productId }: { productId: string }) => nextTagTarget(`product:${productId}`)
});

stale.mirror("ProductSearch", {
  when: "ProductPriceChanged",
  target: ({ productId }: { productId: string }) => searchTarget("products", productId)
});

stale.mirror("ProductRoom", {
  when: "ProductPriceChanged",
  target: ({ productId }: { productId: string }) => socketTarget(`product:${productId}`, { event: "product.price.changed" })
});

const receipt = await stale.changed("ProductPriceChanged", {
  productId: "p_123",
  categoryId: "c_456",
  price: 79
});

console.log(receipt.toText());
