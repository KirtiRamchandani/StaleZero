# Adapter Authoring

An adapter is intentionally small:

```ts
const adapter = {
  name: "example",
  execute: async (target, context) => {
    await client.invalidate(target.key);
  }
};
```

Guidelines:

- Keep external dependencies out of `@stalezero/core`.
- Make the adapter name match the target helper.
- Throw on real failures so receipts can report them.
- Respect `target.action`, `target.meta`, `target.timeoutMs`, and `target.retries`.
- Keep target helpers serializable.
