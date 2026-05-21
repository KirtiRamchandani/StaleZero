# API Stability

| Surface | Stability |
| --- | --- |
| `createStaleZero()` | Stable |
| `changed()` | Stable |
| `preview()` | Stable |
| `snapshot()`, `compareSnapshots()`, `replay()` | Stable |
| `flow()` and `StaleZeroFlowBuilder` | Stable |
| `undoable()`, `previewUndo()`, `undo()` | Stable |
| `timeMachine()`, `incident()`, `playbook()` | Stable |
| `drift.scan()` | Stable |
| `impact()`, `cost()`, `canary()` | Stable |
| `emits()`, `consumes()`, `contractCheck()`, `schemaRegistry()` | Stable |
| State proofs with adapter `verify()` | Stable |
| `diagnostics()` and `codeowners()` | Stable |
| `contract()` mutation behavior tests | Stable |
| `receipts` | Stable |
| Memory adapter | Stable |
| Redis adapter | Stable |
| React Query adapter | Stable |
| SWR adapter | Stable |
| Next adapter | Stable/server-only |
| Redux, RTK Query, tRPC, Zustand, Apollo, GraphQL adapters | Stable |
| Cloudflare KV, WebSocket, search, HTTP adapters | Stable |
| Memory, Redis, Postgres, Kafka, NATS, HTTP buses | Stable |
| 52 target helper catalog | Stable |
| Mutation Studio data API and devtools handler | Stable |
| CLI | Stable |
| Adapter template package | Stable |

Stable APIs should not break within a major version.

New labs-only APIs, when introduced, must be clearly marked in their package README before release.

## Versioning

StaleZero starts at `0.1.0` with the public API freeze documented here. The project follows semantic versioning once `1.0.0` is published.

## Deprecation

Stable APIs should receive a documented deprecation notice before removal.
