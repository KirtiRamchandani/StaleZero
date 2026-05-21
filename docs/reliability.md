# Production Reliability

StaleZero is designed to make mutation consequences explicit and recoverable. The core engine gives every run a receipt, every target an execution result, and every distributed event an ID that can be deduped.

## Runtime controls

| Control | Where | Purpose |
| --- | --- | --- |
| `timeoutMs` | `execution` or target | Stops slow adapters from holding the mutation forever. |
| `retries` | `execution` or target | Retries temporary adapter failures. |
| `retry.backoffMs` | `execution` | Adds exponential backoff between retries. |
| `retry.jitter` | `execution` | Spreads retries so many targets do not retry at the same instant. |
| `concurrency` | `execution` | Caps parallel target execution. |
| `rateLimitPerSecond` | `execution` | Adds per-adapter backpressure. |
| `circuitBreaker` | `execution` | Opens an adapter circuit after repeated failures. |
| `dedupeWindowMs` | `execution` | Skips duplicate target executions within a short window. |
| `payloadLimitBytes` | `execution` | Refuses unexpectedly large mutation payloads. |
| `idempotencyKey` | `changed()` options | Reuses a caller-provided receipt/event ID. |

## Failure policy

Use `best-effort` when a mutation should keep going and the receipt should record failures. Use `strict` when a failed required invalidation should throw. Use `dry-run` to produce a receipt-shaped preview without adapter execution.

Targets can be marked `required`, `group`, and `lane` so teams can document blast radius and organize priority lanes. Priority is enforced numerically; lower values run first.

## Receipts and retention

Use a durable `ReceiptStore` in production. Stores can implement:

- `save(receipt)` for normal writes.
- `list(options)` for devtools and audits.
- `get(id)` for support workflows.
- `prune({ maxAgeMs, maxEntries })` for retention.
- `export(options)` for bulk receipt export.

Configure `receipts.retentionMs` and `receipts.maxEntries` to avoid unbounded local storage.

## Event replay

Distributed events include `id`, `traceId`, `source`, and `hops`. The engine dedupes event IDs, supports `ignoreSelf`, and stops loops through `maxHops`. Bus packages should keep dead letters when delivery fails and expose replay helpers when the underlying system supports them.

## Readiness and shutdown

Call `await stale.ready()` during startup. Call `await stale.health()` for a detailed adapter report. Call `await stale.shutdown()` before process exit to unsubscribe buses and let adapters close resources.
