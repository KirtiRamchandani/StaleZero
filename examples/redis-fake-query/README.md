# Redis + Fake Query Example

```ts
const stale = createStaleZero();

stale.use(redisAdapter(redis));
stale.use({
  name: "query",
  execute: (target) => queryClient.invalidateQueries({ queryKey: JSON.parse(target.key) })
});

await stale
  .mutate("UserUpdated", { userId })
  .redis(`user:${userId}`)
  .query(["user", userId])
  .run();
```
