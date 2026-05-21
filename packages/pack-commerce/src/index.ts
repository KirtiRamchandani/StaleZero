import type { StaleZero } from "@stalezero/core";

export function commercePack(stale: StaleZero): void {
  stale.resource("Product", { id: "productId", cache: { prefix: "product:" }, query: true, next: true, socket: true });
  stale.resource("Inventory", { id: "sku", cache: { prefix: "inventory:" }, query: true, next: true, socket: true });
  stale.resource("Order", { id: "orderId", cache: { prefix: "order:" }, query: true, next: true, socket: true });
  stale.mutation("ProductPriceChanged", {
    affects: (input: { productId: string }) => [{ type: "Product", id: input.productId }],
    targets: (input: { productId: string }) => [
      { adapter: "redis", key: `product:${input.productId}`, action: "delete" },
      { adapter: "query", key: JSON.stringify(["product", input.productId]), action: "invalidate", meta: { queryKey: ["product", input.productId] } },
      { adapter: "next", key: `product:${input.productId}`, action: "revalidate", meta: { kind: "tag" } },
      { adapter: "search", key: `products:${input.productId}`, action: "enqueue", meta: { index: "products", id: input.productId } }
    ]
  });
}

export default commercePack;
