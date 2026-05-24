# Operations Layer

The operations layer turns mutation consequences into an execution and incident surface. It is built for the questions teams ask when a mutation is risky, failed, reversible, or spread across services.

## Core APIs

| API | Use |
| --- | --- |
| `flow(name, input)` | Run ordered, parallel, optional, retryable, and compensating mutation steps. |
| `undoable(name, definition)` | Register a reversible mutation handler. |
| `previewUndo(receipt)` / `undo(receipt)` | Inspect and run undo work for a receipt. |
| `timeMachine()` | Search receipts, compare old receipts to the current graph, and export incidents. |
| `drift.scan(entity, id)` | Check whether real targets still match graph expectations. |
| `impact(name, input)` | Score mutation risk before execution. |
| `playbook(receipt)` | Generate deterministic recovery steps from failures. |
| `emits()` / `consumes()` / `contractCheck()` | Verify service event contracts. |
| `schemaRegistry()` | Store local schema versions, diffs, docs, and compatibility matrix. |
| `changed(name, input, { prove: true })` | Run adapter proof checks after execution. |
| `prove(receipt)` | Re-check a stored receipt in proof-only mode. |
| `lint()` | Find graph safety and ownership issues. |
| `explainStale(entity)` | Correlate receipts and expected targets for stale-data debugging. |
| `heatmap()` | Summarize hot mutations, slow targets, and adapter failure rate. |
| `optimizeCost()` | Suggest coalescing, batching, and narrower target routing. |
| `freshness(name, budget)` | Attach freshness expectations to mutations, entities, or targets. |
| `profile(name, config)` | Reuse consistency, proof, and idempotency defaults. |
| `rollout()` / `shadow()` | Compare new mutation wiring safely before full rollout. |
| `ownershipMap()` / `score()` / `badge()` | Make graph readiness visible. |
| `humanReceipt()` / `notify()` / `runbooks()` | Turn receipts into support and operations material. |
| `canary(name, input)` | Dry-run production readiness for a mutation. |
| `incident(receipt)` | Export a receipt as an incident note. |
| `replay(receipt, filters)` | Replay exact, failed, required, adapter-only, or safe targets. |
| `cost(name, input)` | Estimate target count, external calls, and mutation cost. |
| `diagnostics()` | Produce editor-friendly graph warnings. |

## Flow Example

```ts
await stale
  .flow("CancelOrder", { orderId })
  .step("refund-payment", refundPayment, { retry: 2, timeoutMs: 5000 })
  .parallel("cleanup", [
    { name: "return-inventory", run: returnInventory },
    { name: "send-email", run: sendEmail, options: { optional: true } }
  ])
  .changed("OrderCancelled")
  .run();
```

## Proof Example

```ts
stale.use({
  name: "redis",
  execute: (target) => redis.del(target.key),
  verify: async (target) => !(await redis.exists(target.key))
});

const receipt = await stale.changed("UserUpdated", { userId: "123" }, { prove: true });
```

## CLI

```bash
stalezero canary ProductPriceChanged --productId=p1
stalezero lint --ci
stalezero prove receipt.json --ci
stalezero explain-stale User:123
stalezero replay receipt.json --failed-only --safe-replay
stalezero incident receipt.json
stalezero scan duplicates src
stalezero cost ProductPriceChanged --productId=p1
stalezero heatmap
stalezero optimize-cost
stalezero score
```
