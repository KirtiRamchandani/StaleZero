# Distributed Guarantees

StaleZero coordinates mutation consequences. It does not make distributed systems magically exactly-once.

| Term | Meaning |
| --- | --- |
| at-most-once | An event may be dropped but will not be deliberately retried by that bus. |
| at-least-once | An event may be delivered more than once; handlers must be idempotent. |
| effectively-once | Replays and duplicates are safe because idempotency keys and target dedupe are configured. |
| exactly-once | Not guaranteed by StaleZero. |

Production distributed mode should define:

- outbox policy
- inbox dedupe key
- message ordering expectations
- poison message handling
- dead-letter queue behavior
- replay authorization
- event schema versioning
- retention and cleanup
- duplicate delivery behavior

Use receipts to observe partial execution. Use idempotency keys to make duplicate delivery safe.

