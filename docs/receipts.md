# Receipts

Every mutation returns a receipt. A receipt records affected entities, matched targets, adapter results, timing, failures, and the final status.

```ts
const receipt = await stale.changed("UserUpdated", input);

console.log(receipt.toText());
console.log(receipt.toJSON());
receipt.assertSuccess();
```

Statuses:

| Status | Meaning |
| --- | --- |
| `success` | Every target succeeded or was skipped intentionally |
| `partial` | Some targets failed |
| `failed` | Every target failed |
| `dry-run` | Nothing executed |

Receipts can also include proof status, changed fields, rollout and shadow comparisons, freshness checks, cost, SLOs, owner metadata, and approval results. The stable field list is documented in [Receipt Schema](receipt-schema.md).

Use receipt redaction for sensitive fields:

```ts
createStaleZero({
  receipts: {
    redact: ["email", "token", "password"]
  }
});
```
