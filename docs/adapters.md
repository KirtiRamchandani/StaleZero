# Adapter Guides

Adapters are small objects with a `name` and `execute(target, context)` function. Core never imports Redis, React, Next, or any other heavy runtime.

## Redis

```ts
stale.use(redisAdapter(redis));
stale.mirror("RedisUser", {
  when: "UserUpdated",
  target: ({ userId }) => redisTarget(`user:${userId}`)
});
```

Pattern deletes are guarded and require a safe prefix.

## React Query

```ts
stale.use(reactQueryAdapter(queryClient));
queryTarget(["user", userId]);
```

## SWR

```ts
stale.use(swrAdapter(mutate));
swrTarget(`/api/user/${userId}`);
```

## Redux

```ts
stale.use(reduxAdapter(store));
reduxTarget(`users.byId.${userId}`);
```

## Next.js

```ts
stale.use(nextCacheAdapter({ revalidateTag, revalidatePath }));
nextTagTarget(`user:${userId}`);
nextPathTarget(`/users/${userId}`);
```

## RTK Query

```ts
stale.use(rtkQueryAdapter({ api, store }));
rtkQueryTarget([{ type: "User", id: userId }]);
```

## tRPC

```ts
stale.use(trpcAdapter({ utils }));
trpcTarget("user.byId", { input: { id: userId } });
```
