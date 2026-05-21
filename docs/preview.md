# Preview Mode

Preview mode calculates the affected entities and targets without executing adapters.

```ts
const preview = await stale.preview("ProductPriceChanged", {
  productId: "p_123",
  categoryId: "c_456"
});

console.log(preview.toText());
```

Preview is useful in tests, route handlers, deploy reviews, and devtools.
