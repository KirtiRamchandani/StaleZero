# Next Fullstack Example

Register the Next, React Query, and Redis adapters where each runtime owns them:

```ts
import { revalidatePath, revalidateTag } from "next/cache";
import { createStaleZero, entity, nextCacheAdapter, queryTarget, redisAdapter, redisTarget } from "stalezero";

export const stale = createStaleZero({ app: "web" });

stale.use(nextCacheAdapter({ revalidatePath, revalidateTag }));
stale.use(redisAdapter(redis));

stale.mutation("UserUpdated", {
  affects: ({ userId }) => [entity("User", userId)]
});

stale.mirror("RedisUser", {
  when: "UserUpdated",
  target: ({ userId }) => redisTarget(`user:${userId}`)
});

stale.mirror("UserQuery", {
  when: "UserUpdated",
  target: ({ userId }) => queryTarget(["user", userId])
});
```

In the browser, a client-owned instance can register `reactQueryAdapter(queryClient)` and the distributed bus can deliver the same mutation event to it. In a server action, update the source data and call `stale.changed()` with the mutation input.
