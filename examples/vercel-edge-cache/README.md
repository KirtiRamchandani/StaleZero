# Vercel and Edge Cache Example

Keep cache invalidation in server-only code.

```ts
import { revalidatePath, revalidateTag } from "next/cache";

stale.use(nextCacheAdapter({ revalidatePath, revalidateTag }));
```

For edge runtimes, use HTTP targets or a bus to call a server endpoint that owns revalidation.
