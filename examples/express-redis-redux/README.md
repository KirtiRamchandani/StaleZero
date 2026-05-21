# Express Redis Redux Example

```ts
const stale = createStaleZero({ app: "api" });

stale.use(redisAdapter(redis));
stale.use(reduxAdapter(store));

stale.mutation("UserUpdated", {
  affects: ({ userId }) => [entity("User", userId)]
});

stale.mirror("RedisUser", {
  when: "UserUpdated",
  target: ({ userId }) => redisTarget(`user:${userId}`)
});
```
