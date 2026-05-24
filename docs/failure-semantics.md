# Failure Semantics

Failure behavior must be boring and predictable.

| Concept | Meaning |
| --- | --- |
| `strict` | Required target failures make the receipt blocking and `changed()` throws a `StaleZeroExecutionError`. |
| `best-effort` | Failures are recorded on the receipt but `changed()` returns normally. |
| `dry-run` | No adapter executes. Targets are marked skipped and the receipt is simulated. |
| required target | The default. Failure affects receipt status and strict mode. |
| optional target | Set `required: false`. Failure is visible but non-blocking. |
| timeout | Target execution fails after the target or global timeout. |
| retry | A target can retry before it is marked failed. |
| proof failure | Required proof failure changes proof status and can make a successful execution partial. |

Examples:

- Redis succeeds and Next revalidation fails: receipt is `partial`; strict mode throws.
- Socket notification times out with `required: false`: receipt records the failure but strict mode does not block.
- Search enqueue retries twice then fails: attempts are recorded on the result.
- Analytics target fails with `required: false`: support can see it, user flow can continue.
- Audit log target fails with default required behavior: strict mode should block if audit is mandatory.

Use the target `required` flag to make the business policy visible in code review.

