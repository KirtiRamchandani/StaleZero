# Quick Builder Mode

Quick builder mode is the fastest way to adopt StaleZero.

```ts
await stale
  .mutate("UserUpdated", { userId })
  .redis(`user:${userId}`)
  .query(["user", userId])
  .swr(`/api/user/${userId}`)
  .nextTag(`user:${userId}`)
  .run();
```

Each chained call appends a target. `run()` executes the targets and returns a receipt.
