# WebSocket Notification Demo

```ts
stale.use(websocketAdapter(io));

await stale
  .mutate("ProductPriceChanged", { productId })
  .socket(`product:${productId}`, "product.price.changed")
  .run();
```
