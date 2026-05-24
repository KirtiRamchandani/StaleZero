# Receipt Schema

Receipts are production artifacts, not debug strings. They should be safe to store, search, export, diff, and hand to another team.

Core fields:

| Field | Purpose |
| --- | --- |
| `id` | Receipt and event correlation id. |
| `mutation` | Named mutation that produced the receipt. |
| `input` | Redacted mutation input. |
| `affected` | Entity references touched by the mutation. |
| `targets` | Planned target list. |
| `results` | Adapter execution results with status, duration, attempts, batch, coalescing, and error details. |
| `status` | `success`, `partial`, `failed`, or `dry-run`. |
| `durationMs` | End-to-end mutation consequence duration. |
| `timestamp` | Receipt creation time in epoch milliseconds. |
| `app`, `traceId`, `owner` | Operational correlation metadata. |
| `risk`, `cost`, `slo`, `freshness` | Optional production signals. |
| `proofs`, `proofStatus` | Adapter verification results. |
| `changedFields` | Field-level routing context. |
| `rollout`, `shadow` | Safe rollout comparison data. |
| `approval` | Approval gate outcome. |

Recommended application metadata:

- request id
- actor summary
- tenant id
- environment
- application version
- git sha
- mutation version
- input hash

StaleZero stores only the fields you pass to it. Keep raw business payloads out of receipts unless there is a clear audit requirement and matching redaction policy.

