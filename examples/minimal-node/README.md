# Minimal Node Example

```ts
import { createStaleZero, memoryAdapter, memoryTarget } from "stalezero";

const adapter = memoryAdapter();
const stale = createStaleZero();

stale.use(adapter);

const receipt = await stale
  .mutate("UserUpdated", { userId: "123" })
  .target(memoryTarget("user:123"))
  .run();

console.log(receipt.toText());
```
