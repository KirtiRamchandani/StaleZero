# Preview Mode

Preview mode calculates the affected entities and targets without executing adapters.

```ts
const preview = await stale.preview("ProductPriceChanged", {
  productId: "p_123",
  categoryId: "c_456"
});

console.log(preview.toText());
console.log(preview.toJSON().confidence);
```

Preview is useful in tests, route handlers, deploy reviews, and devtools.

Preview confidence is part of the contract:

- `exact` for deterministic keys,
- `estimated` for external systems,
- `unsafe` for wildcard or broad targets,
- `unknown` for manifest-only targets.

See [Preview Confidence](preview-confidence.md).
