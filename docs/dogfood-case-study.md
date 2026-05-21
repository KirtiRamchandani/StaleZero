# Dogfood Case Study

## App

The dogfood app models a small commerce flow:

- Product page.
- Cart.
- Admin price editor.
- Redis cache.
- React Query product data.
- SWR endpoint.
- Zustand cart.
- Next tag revalidation.
- WebSocket notification.
- Search reindex queue.
- Devtools enabled with auth in development only.

## Before

Updating a product price required invalidation calls spread across the admin action, API route, cache helper, search helper, socket helper, and frontend state modules.

```ts
await redis.del(`product:${id}`);
queryClient.invalidateQueries({ queryKey: ["product", id] });
mutate(`/api/products/${id}`);
cartStore.getState().markProductStale(id);
revalidateTag(`product:${id}`);
io.to(`product:${id}`).emit("product.price.changed");
await searchQueue.add("reindex", { index: "products", id });
await webhook("/events/product-price-changed", { id });
```

## After

The mutation consequence graph lives in one module.

```ts
await stale.changed("ProductPriceChanged", { productId: id });
```

The receipt shows Redis, React Query, SWR, Zustand, Next, WebSocket, search, and HTTP targets in one support artifact.
