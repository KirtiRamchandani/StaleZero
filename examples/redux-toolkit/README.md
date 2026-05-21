# Redux Toolkit Example

```ts
import { reduxAdapter, rtkQueryAdapter, rtkQueryTarget } from "stalezero";

stale.use(reduxAdapter(store));
stale.use(rtkQueryAdapter({ api, store }));

stale.mirror("UserTag", {
  when: "UserUpdated",
  target: ({ userId }) => rtkQueryTarget([{ type: "User", id: userId }])
});
```
