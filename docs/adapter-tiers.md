# Adapter Tiers

StaleZero is intentionally honest about adapter maturity.

| Tier | Meaning | Current packages |
| --- | --- | --- |
| Tier 1: core path | Core loop and deterministic local tests. | `@stalezero/core`, memory adapter, testing helpers |
| Tier 2: beta adapters | Well-covered adapters intended for real app trials. | Redis, React Query, SWR, Next, HTTP, WebSocket, search |
| Tier 3: experimental adapters | Useful but still settling public behavior. | Redux, RTK Query, tRPC, Zustand, Apollo, GraphQL, Cloudflare KV |
| Tier 4: bus labs | Distributed coordination surfaces that require app-specific reliability choices. | Redis Streams, Postgres outbox, Kafka, NATS, HTTP bus |
| Target helpers | Typed target references; execution depends on the adapter you provide. | Browser, CDN, edge, storage, product-domain, workflow, observability helpers |

Every adapter should document:

- supported actions
- unsupported actions
- idempotency behavior
- retry safety
- batch support
- timeout behavior
- failure semantics
- optional dependencies
- test matrix
- real or fake integration example

Do not promote an adapter to Tier 1 without adapter contract tests, examples, and production feedback.

