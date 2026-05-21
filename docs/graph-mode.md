# Graph Mode

Graph mode registers relationships once.

```ts
stale.mutation("UserUpdated", {
  affects: ({ userId }) => [entity("User", userId)]
});

stale.mirror("RedisUser", {
  when: "UserUpdated",
  target: ({ userId }) => redisTarget(`user:${userId}`)
});
```

After that, app code only announces the source change:

```ts
await stale.changed("UserUpdated", { userId });
```
