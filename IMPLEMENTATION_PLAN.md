# StaleZero Implementation Plan

This plan tracks the world-class feature roadmap for [StaleZero](https://github.com/KirtiRamchandani/StaleZero). It is derived from the full product brief and kept current as features ship.

## North Star

StaleZero is the standard TypeScript mutation-consequence engine: when data changes, every cache, state store, view, queue, search index, websocket client, and downstream system receives the correct invalidation or sync action with proof, observability, safety, and developer confidence.

Core promise: declare the mutation once, preview the blast radius, execute safely, prove the result, and keep the receipt.

## Phase Status

| Phase | Focus | Status |
| --- | --- | --- |
| 1 | Stabilize core API, safety, tests | Complete |
| 2 | Developer experience (CLI, docs, devtools) | Complete |
| 3 | Production readiness (durable receipts, OTEL, drift) | Complete |
| 4 | Ecosystem (recipes, templates, community adapters) | Strong RC |

## Engine Architecture (split complete)

`packages/core/src/engine.ts` is a thin re-export. Logic lives in:

| Module | Responsibility |
| --- | --- |
| `engine/StaleZeroEngine.ts` | Main engine class |
| `engine/builders.ts` | QuickMutationBuilder, FlowBuilder, ResourceBuilder |
| `engine/api.ts` | Public `StaleZero` interface |
| `engine/internal.ts` | Resolved config and internal types |
| `engine/lifecycle.ts` | Pipeline hooks |
| `create.ts` | `createStaleZero` + production/dev/test presets |
| `utils/*` | Targeting, risk, proof, preview, lint, hashing, redaction, SLO dashboard |

## Shipped

- Production/dev/test presets, typed errors, HTTP SSRF guards, AbortSignal timeouts
- Engine split into focused modules
- Receipt schema v1 with integrity hashing and rich formatters
- Durable stores: Memory, File, SQLite, Postgres, Redis, **S3**, **DynamoDB**, **OpenSearch**
- Receipt queries by mutation, actor, tenant, and status
- Value-based redaction detectors + property tests
- Adapter SDK + conformance test helpers
- Adapters: BullMQ, Memcached, CDN; hardened Redis adapter
- OpenTelemetry metrics hooks
- VitePress docs site (`npm run docs:dev`)
- GitHub Action PR mutation-graph diff
- **`npm create stalezero`** app template (`create-stalezero` package)
- CLI: drift (manifest + receipts), **freshness-dashboard**, app create, adapter create
- Property/fuzz tests for dedupe determinism (`fast-check`)

## Remaining (post-v1 ideas)

- Hosted freshness/SLO visual dashboard UI
- Additional community adapters (Algolia, Relay, framework-specific packs)
- Receipt encryption-at-rest hooks

## Definition of Done

StaleZero is world-class when:

- A developer gets value in under five minutes
- Production defaults are safe without extra configuration
- Receipts are durable, versioned, and queryable
- Adapters enforce their own security boundaries
- CI catches graph, API, and security regressions
- Docs answer real production questions honestly

## Guiding Rule

Every feature must serve one question:

> After this mutation, what must change, did it change, and can I prove it?
