# What StaleZero Is Not

StaleZero is not a database, cache, state manager, queue, workflow engine, or hosted service.

It does not infer dependencies automatically from your code. You declare the relationship between a mutation and the systems that must react.

The promise is explicit coordination:

```ts
await stale.changed("UserUpdated", { userId, teamId });
```

That call can invalidate Redis, React Query, SWR, Redux, Next.js cache, search, sockets, and queues through adapters you choose.
