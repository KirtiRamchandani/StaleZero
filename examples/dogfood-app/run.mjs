import {
  createStaleZero,
  entity,
  memoryAdapter,
  memoryTarget,
  nextTagTarget,
  queryTarget,
  searchAdapter,
  socketTarget,
  swrTarget,
  zustandTarget
} from "../../packages/stalezero/dist/index.js";

const memory = memoryAdapter();
const emitted = [];
const searchJobs = [];
const clientInvalidations = [];

const stale = createStaleZero({ app: "dogfood-commerce", environment: "demo" });
stale.use(memory);
stale.use({ name: "query", execute: (target) => clientInvalidations.push(target.key) });
stale.use({ name: "swr", execute: (target) => clientInvalidations.push(target.key) });
stale.use({ name: "next", execute: (target) => clientInvalidations.push(target.key) });
stale.use({ name: "zustand", execute: (target) => clientInvalidations.push(target.key) });
stale.use({ name: "socket", execute: (target) => emitted.push(target.key) });
stale.use(searchAdapter({ handler: (job) => searchJobs.push(job) }));

stale.mutation("ProductPriceChanged", {
  affects: ({ productId }) => [entity("Product", productId)]
});
stale.mirror("RedisProduct", { when: "ProductPriceChanged", target: ({ productId }) => memoryTarget(`product:${productId}`) });
stale.mirror("ReactQueryProduct", { when: "ProductPriceChanged", target: ({ productId }) => queryTarget(["product", productId]) });
stale.mirror("SwrProduct", { when: "ProductPriceChanged", target: ({ productId }) => swrTarget(`/api/products/${productId}`) });
stale.mirror("NextProductTag", { when: "ProductPriceChanged", target: ({ productId }) => nextTagTarget(`product:${productId}`) });
stale.mirror("ZustandCart", { when: "ProductPriceChanged", target: ({ productId }) => zustandTarget(`cart.products.${productId}`) });
stale.mirror("ProductRoom", { when: "ProductPriceChanged", target: ({ productId }) => socketTarget(`product:${productId}`, { event: "product.price.changed" }) });
stale.mirror("SearchProduct", {
  when: "ProductPriceChanged",
  target: ({ productId }) => ({ adapter: "search", key: `products:${productId}`, action: "enqueue", meta: { index: "products", id: productId } })
});

const preview = await stale.preview("ProductPriceChanged", { productId: "p1", price: 42 });
const receipt = await stale.changed("ProductPriceChanged", { productId: "p1", price: 42 });

console.log(preview.toText());
console.log(receipt.toText());
console.log(JSON.stringify({ emitted, clientInvalidations, searchJobs: searchJobs.length }, null, 2));
