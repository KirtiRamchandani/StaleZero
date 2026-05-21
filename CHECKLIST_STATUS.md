# Checklist Status

This file maps the product checklist to the current repository state.

## Core Engine

Complete:

- Stable `createStaleZero()` public API
- `changed()`, `preview()`, `mutation()`, `mirror()`, `view()`
- Target matching from mutation input
- Receipts with text and JSON output
- Adapter registration
- Memory adapter
- Golden-path and failure tests
- Best-effort, strict, and dry-run modes
- Timeout, retry, priority, concurrency, and dedupe
- Why mode
- Quick builder
- Command mode
- Manifest generation/loading
- Schema validation through `parse`, `safeParse`, or `validate`
- Type-safe mutation input inference
- OpenTelemetry hooks package
- Idempotency keys
- Receipt retention and bulk export
- Adapter circuit breaker, rate limit, backoff, jitter, health checks, readiness, and shutdown
- Required vs optional target failure behavior
- Mutation Studio data hooks through `stale.devtools()`
- Mutation snapshots and snapshot comparison
- Receipt replay modes: sandbox, dry-run, safe-replay, and force
- Mutation contract checks
- Recipe and template installation
- Resource smart defaults
- Compiled manifest indexes
- Target batching through `adapter.batchExecute()`
- Cache stampede coalescing
- Mutation SLO evaluation
- Inbox event processing, dedupe, replay, and dead-letter hooks
- Lightweight workflows with step status and compensation hooks
- Black box recorder
- Mutation firewall, tenant guard, approval gates, risk scoring, rate limits, and adapter sandboxes

Verification coverage:

- [packages/core/src/engine.test.ts](packages/core/src/engine.test.ts) covers golden path, quick builder, preview, strict failure behavior, retry, audit hooks, and payload limits.
- [packages/core/src/readiness.test.ts](packages/core/src/readiness.test.ts) covers manifest loading, source registration, priority, concurrency, dedupe, dry-run, best-effort failure behavior, timeouts, command mode, schema validation, bus receipt correlation, idempotency, receipt retention, health checks, shutdown, circuit breakers, and batch changes.
- [packages/core/src/studio-features.test.ts](packages/core/src/studio-features.test.ts) covers snapshots, replay, contracts, resources, batching, coalescing, SLOs, inbox, workflows, black box records, and safety boundaries.
- [packages/stalezero/src/adapter-specific.test.ts](packages/stalezero/src/adapter-specific.test.ts) covers adapter-specific action payloads, missing clients, unsupported actions, signing, timeouts, and failure behavior.
- [packages/core/src/type-inference.ts](packages/core/src/type-inference.ts) compiles positive typed mutation calls and intentionally rejects invalid inputs with `@ts-expect-error`.

## Adapters

Complete:

- Redis
- Redux
- RTK Query
- React Query
- SWR
- tRPC
- Zustand
- Next.js cache
- Apollo
- GraphQL
- Cloudflare Workers KV
- WebSocket
- Search queue
- HTTP webhook
- Memory

Examples are included for Prisma middleware, Drizzle, Supabase/Firebase, and Vercel/edge cache usage.

## Distributed

Complete:

- Event bus interface
- Memory bus
- Redis Pub/Sub bus
- Redis Streams publish bus
- Redis Streams subscribe worker
- Postgres LISTEN/NOTIFY bus
- Postgres outbox schema/helper
- Postgres outbox fetch, replay, cleanup, processed, and failed helpers
- Kafka bus
- NATS bus
- HTTP webhook bus
- Event id dedupe
- `ignoreSelf`
- `maxHops`
- Receipt/event correlation
- Memory dead-letter support
- Memory event replay

## Devtools

Complete:

- Receipt timeline
- Blast-radius graph
- Preview endpoint and form
- Adapter result table
- Failed invalidation view
- Slow adapter timing view
- Mutation detail endpoint
- Target detail endpoint
- Why endpoint and form
- Distributed event log endpoint
- Outbox queue endpoint
- Manifest graph explorer
- Receipt JSON export
- Reproduction snippet endpoint
- Redaction preview endpoint
- Express/Fastify/Next handlers
- React-compatible panel factory
- Production disabled-by-default behavior
- Auth hook, CORS controls, payload limits, filtering, dark mode, and static HTML export

## CLI

Complete:

- `stalezero init`
- `stalezero validate`
- `stalezero preview`
- `stalezero doctor`
- `stalezero snapshot`
- `stalezero replay`
- `stalezero compile`
- `stalezero test-contracts`
- `stalezero generate`
- `stalezero docs`
- `stalezero doctor --supply-chain`
- `stalezero graph`
- `stalezero devtools`
- `stalezero manifest`
- `stalezero receipt <id|file>`
- `stalezero why <target>`
- `stalezero list mutations`
- `stalezero list targets`

## Testing

Complete:

- `createTestStaleZero()`
- Memory adapter spy
- Fake bus
- Fake receipt store
- Vitest matchers
- Jest matchers
- Receipt assertions
- Ecommerce fixture
- Adapter contract helper
- Generic adapter contract suite helper
- Publishable adapter template package

## Packaging

Complete:

- Root workspace build
- `npm install`
- `npm run build`
- `npm test`
- Package exports and `.d.ts` generation
- ESM import
- CJS decision documented
- Peer dependencies and optional dependency isolation
- Tree-shakeable core
- README badges
- Changesets config and release workflow
- GitHub Actions CI
- npm provenance workflow
- License
- Security policy
- Code of conduct
- Adapter template smoke report
- Snapshot helper package
- GitHub mutation diff and security inspector reporter package
- Recipe package
- SaaS, commerce, and auth mutation packs
