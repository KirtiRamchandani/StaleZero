# StaleZero Implementation Plan

This plan tracks the world-class feature roadmap for [StaleZero](https://github.com/KirtiRamchandani/StaleZero). It is derived from the full product brief and kept current as features ship.

## North Star

StaleZero is the standard TypeScript mutation-consequence engine: when data changes, every cache, state store, view, queue, search index, websocket client, and downstream system receives the correct invalidation or sync action with proof, observability, safety, and developer confidence.

Core promise: declare the mutation once, preview the blast radius, execute safely, prove the result, and keep the receipt.

## Phase Status

| Phase | Focus | Status |
| --- | --- | --- |
| 1 | Stabilize core API, safety, tests | In progress |
| 2 | Developer experience (CLI, docs, devtools) | Strong RC |
| 3 | Production readiness (durable receipts, OTEL, drift) | In progress |
| 4 | Ecosystem (recipes, templates, community adapters) | Partial |

## Shipped in This Cycle

- `createStaleZero.production()`, `.dev()`, `.test()` presets with safe defaults
- `allowUndeclaredMutations` policy (`reject` in production, `warn` in development)
- `StaleZeroError` hierarchy with typed codes and docs URLs
- HTTP adapter SSRF checks, redirect protection, body/response limits
- Cooperative `AbortSignal` on `MutationContext` and timeout helpers
- `batchExecute` partial-result contract
- Receipt schema versioning (`schemaVersion: 1`)
- Durable stores: `FileReceiptStore`, `SqliteReceiptStore`, `PostgresReceiptStore`
- Human receipt formatters: `toMarkdown()`, `toSlack()`, `toMermaid()`
- Quick builder: `.dryRun()`, `.strict()`, `.withActor()`, `.prove()`, `.idempotencyKey()`
- CLI: `run`, `dry-run`, `receipts list|show|export`, `graph --format mermaid|dot`
- Production devtools auth requirement when `enabledInProduction` is true

## Next Priorities

1. Split `engine.ts` into focused modules (`execution`, `preview`, `guards`, `proof`, `drift`)
2. Docs site (VitePress) with versioned API reference
3. GitHub Action workflow for PR mutation-graph diff comments
4. Property/fuzz tests for redaction and dedupe determinism
5. OpenTelemetry metrics exporters (Prometheus/Datadog)
6. High-value adapters: BullMQ, Algolia, Memcached, CDN purge helpers

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
