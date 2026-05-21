# Quickstart

Install the main package:

```bash
npm install stalezero
```

Create a local engine:

```ts
import { createStaleZero } from "stalezero";

export const stale = createStaleZero({
  app: "api",
  execution: {
    defaultConsistency: "best-effort",
    timeoutMs: 3000,
    retries: 1,
    concurrency: 10
  }
});
```

Register adapters in the process that owns those systems:

```ts
stale.use(redisAdapter(redis));
stale.use(reactQueryAdapter(queryClient));
stale.use(nextCacheAdapter({ revalidateTag, revalidatePath }));
```

Run a mutation:

```ts
const receipt = await stale
  .mutate("ProductPriceChanged", { productId })
  .redis(`product:${productId}`)
  .query(["product", productId])
  .nextTag(`product:${productId}`)
  .run();

receipt.assertSuccess();
```
