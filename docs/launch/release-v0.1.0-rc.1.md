# StaleZero v0.1.0-rc.1

First release candidate for StaleZero: a mutation consequence engine for cache invalidation, client state refresh, server revalidation, distributed events, receipts, and devtools.

## Highlights

- Stable core API: `createStaleZero()`, `changed()`, `preview()`, `why()`, receipts, manifests, strict mode, best-effort mode, and dry runs.
- Adapter coverage for memory, Redis-style cache targets, React Query, SWR, Redux, RTK Query, Next cache revalidation, HTTP, WebSocket, search queues, Cloudflare KV, Apollo, Zustand, tRPC, GraphQL, and OpenTelemetry.
- Distributed event bus interfaces with memory, Redis Pub/Sub, Redis Streams, Postgres, HTTP webhook, Kafka, and NATS implementations.
- Devtools, Mutation Studio, graph export, replay, snapshots, contract tests, recipes, packs, templates, smart defaults, and black-box recording.
- CLI support for init, preview, validate, doctor, graph, manifest, receipt lookup, why mode, replay, compile, docs, snapshots, contract tests, and generators.
- Release hardening reports for clean clone verification, package tarballs, consumer smoke tests, CLI smoke tests, examples, benchmarks, package graph, security checks, and license checks.

## Verification

- CI passed on Ubuntu, macOS, and Windows.
- Node 20 and Node 22 passed the build, typecheck, tests, and CLI smoke checks.
- Security Audit passed npm audit, project security verification, license verification, and SBOM generation.
- CodeQL passed on the release commit.

## Notes

This is an RC tag. The packages are prepared for npm publishing, but teams should treat beta and experimental adapters according to the stability table in `docs/api-stability.md`.
