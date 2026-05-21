# SWR Example

```ts
import { createStaleZero, swrAdapter, swrTarget } from "stalezero";

const stale = createStaleZero();
stale.use(swrAdapter(mutate));

stale.mirror("UserApi", {
  when: "UserUpdated",
  target: ({ userId }) => swrTarget(`/api/users/${userId}`)
});
```
