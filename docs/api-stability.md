# API Stability

StaleZero is a release candidate. The core mutation receipt loop is treated as stable; broad adapters and distributed packages are tiered honestly until more real-world usage lands.

| Surface | Stability |
| --- | --- |
| `createStaleZero()` | Stable |
| `mutation()`, `mirror()`, `view()` | Stable |
| `changed()` | Stable |
| `preview()` with confidence metadata | Stable |
| `why()` | Stable |
| receipts, JSON output, pretty output | Stable |
| strict, best-effort, dry-run | Stable |
| required and optional target behavior | Stable |
| timeout, retry, priority, concurrency, dedupe, batching | Stable |
| memory adapter and test helpers | Stable |
| `snapshot()`, `compareSnapshots()`, `replay()` | Stable |
| `prove()` and adapter `verify()` hooks | Stable |
| graph lint, score, badge, ownership map, runbooks | Stable |
| field-level routing and freshness budgets | Stable |
| `flow()` and `StaleZeroFlowBuilder` | Beta |
| `undoable()`, `previewUndo()`, `undo()` | Beta |
| time machine, drift scans, explain-stale, heatmap, cost optimizer | Beta |
| Redis adapter | Beta |
| React Query adapter | Beta |
| SWR adapter | Beta |
| Next adapter | Beta/server-only |
| HTTP, WebSocket, search adapters | Beta |
| Redux, RTK Query, tRPC, Zustand, Apollo, GraphQL adapters | Experimental |
| Cloudflare KV adapter | Experimental |
| memory and Redis buses | Beta |
| Postgres outbox/notify bus | Experimental |
| Kafka, NATS, HTTP buses | Experimental |
| Devtools | Beta |
| CLI | Beta |
| OpenTelemetry hooks | Beta |
| target helper catalog | Target helper only |

Stable means the public shape should not break within a major version.

Beta means the feature is usable and tested, but behavior can still tighten before `1.0.0`.

Experimental means the package is useful for trials and examples, but teams should pin versions and expect changes.

Target helper only means the helper creates a `TargetRef`; production behavior depends on the adapter you register.

## Versioning

StaleZero starts at `0.1.0`. The project follows semantic versioning once `1.0.0` is published.

## Deprecation

Stable APIs should receive a documented deprecation notice before removal. Beta and experimental APIs can change faster, but release notes should still call out migration steps.
