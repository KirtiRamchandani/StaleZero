# Search Reindex Demo

```ts
stale.use(searchAdapter({
  queue: {
    enqueue: (job) => searchQueue.add("reindex", job)
  }
}));

searchTarget("products", productId);
```
