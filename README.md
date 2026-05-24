# StaleZero

<p align="center">
  <img src="docs/assets/logo.svg" width="92" alt="StaleZero logo" />
</p>

<p align="center">
  <strong>No mutation without a receipt.</strong><br />
  Preview the blast radius, run the consequences, prove the result, and keep the receipt.
</p>

<p align="center">
  <a href="https://github.com/KirtiRamchandani/StaleZero/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/KirtiRamchandani/StaleZero/actions/workflows/ci.yml/badge.svg?branch=main"></a>
  <a href="LICENSE"><img alt="license" src="https://img.shields.io/badge/license-MIT-16a34a.svg"></a>
  <img alt="modules" src="https://img.shields.io/badge/modules-ESM-111827.svg">
  <img alt="node" src="https://img.shields.io/badge/node-%3E%3D20-339933.svg">
  <img alt="status" src="https://img.shields.io/badge/status-release_candidate-f59e0b.svg">
</p>

<p align="center">
  <a href="#start-here">Start here</a> /
  <a href="#the-loop">The loop</a> /
  <a href="#receipts">Receipts</a> /
  <a href="#adapter-tiers">Adapter tiers</a> /
  <a href="#cli">CLI</a> /
  <a href="#production">Production</a>
</p>

![StaleZero receipt graph](docs/assets/hero.svg)

StaleZero is the receipt layer for application mutations. It does not replace Redis, TanStack Query, SWR, Redux, Next.js cache APIs, queues, sockets, or event buses. It coordinates their side effects behind one named mutation so the team can answer one hard question:

> After this data changed, what stale data can still exist?

```ts
await stale.changed("ProductPriceChanged", { productId: "p1" });
```

```txt
ProductPriceChanged completed.

Executed:
- ok redis product:p1 delete
- ok query ["product","p1"] invalidate
- ok next product:p1 revalidate
- ok search products:p1 enqueue

Proof: confirmed
- confirmed redis product:p1
- confirmed search products:p1

Risk: low
Status: success
Duration: 9ms
```

## Start Here

```bash
npm install stalezero
```

```ts
import { createStaleZero, entity, nextTagTarget, queryTarget, redisTarget } from "stalezero";

const stale = createStaleZero({
  app: "api",
  environment: process.env.NODE_ENV
});

stale.mutation("UserUpdated", {
  owner: "platform-team",
  affects: ({ userId, teamId }: { userId: string; teamId: string }) => [
    entity("User", userId),
    entity("Team", teamId)
  ]
});

stale.mirror("RedisUser", {
  when: "UserUpdated",
  owner: "platform-team",
  target: ({ userId }: { userId: string }) => redisTarget(`user:${userId}`)
});

stale.mirror("ReactQueryUser", {
  when: "UserUpdated",
  owner: "platform-team",
  target: ({ userId }: { userId: string }) => queryTarget(["user", userId])
});

stale.mirror("NextUserTag", {
  when: "UserUpdated",
  owner: "platform-team",
  target: ({ userId }: { userId: string }) => nextTagTarget(`user:${userId}`)
});

const preview = await stale.preview("UserUpdated", { userId: "123", teamId: "456" });
console.log(preview.toJSON().confidence); // "exact", "estimated", "unsafe", or "unknown"

await db.user.update({ where: { id: "123" }, data });

const receipt = await stale.changed("UserUpdated", { userId: "123", teamId: "456" }, { prove: true });
receipt.assertSuccess();
```

## The Loop

| Step | What it answers |
| --- | --- |
| `preview(name, input)` | What will this mutation touch before anything runs? |
| `changed(name, input)` | Which targets executed, skipped, retried, or failed? |
| `prove(receipt)` | Did required systems actually react? |
| `replay(receipt)` | Can a failed target be safely replayed? |
| `explainStale("User:123")` | Why might this entity still look stale? |
| `lint()` / `stalezero lint` | Is the graph missing owners, schemas, approvals, or safe target rules? |

This is deliberately inspectable. StaleZero should make side effects easier to review, not hide them.

## Receipts

Receipts are the product center. They are durable artifacts for support, security, SRE, reviewers, and future maintainers.

Every receipt can include:

- mutation name, owner, app, environment, trace id, request id
- redacted input, affected entities, changed fields, and freshness status
- target list with required or optional behavior
- execution results, retries, skipped reasons, failures, batches, and coalescing
- proof results from adapter `verify()` hooks
- risk, cost, SLO, rollout, shadow, and approval metadata

See [Receipt Schema](docs/receipt-schema.md), [Failure Semantics](docs/failure-semantics.md), and [Proof Mode](docs/proof-mode.md).

## Preview Confidence

Preview is only useful when the user knows how much to trust it.

| Confidence | Meaning |
| --- | --- |
| `exact` | Deterministic target such as a concrete Redis key or query key. |
| `estimated` | External system target such as search, socket, job, or webhook. |
| `unsafe` | Wildcard or broad target that needs approval or sandbox rules. |
| `unknown` | Manifest-only target without runtime detail. |

See [Preview Confidence](docs/preview-confidence.md).

## Adapter Tiers

The project is a release candidate. The core loop is stable; not every adapter should be treated as battle-tested infrastructure yet.

| Tier | Packages |
| --- | --- |
| Tier 1: core path | `@stalezero/core`, memory adapter, testing helpers |
| Tier 2: beta adapters | Redis, React Query, SWR, Next.js, HTTP, WebSocket, search |
| Tier 3: experimental adapters | Redux, RTK Query, tRPC, Zustand, Apollo, GraphQL, Cloudflare KV |
| Tier 4: bus labs | Redis Streams, Postgres outbox, Kafka, NATS, HTTP bus |
| Target helpers | Browser, edge, CDN, storage, domain, workflow, and observability target helpers |

Each adapter documents supported actions, failure behavior, timeout behavior, retry safety, optional dependencies, and test coverage. See [Adapter Tiers](docs/adapter-tiers.md).

## What Ships

The shipped surface focuses on the mutation receipt loop:

- stable public API: `createStaleZero()`, `mutation()`, `mirror()`, `preview()`, `changed()`, `why()`
- receipt generation with JSON and readable text output
- strict, best-effort, dry-run, timeout, retry, priority, concurrency, dedupe, and batching
- proof mode with adapter `verify()` hooks and CLI `stalezero prove`
- graph linter, project score, ownership map, runbook generation, and score badge
- snapshots, replay, target replay, contract tests, and manifest compilation
- flows, undo, time machine, drift scans, explain-stale reports, heatmaps, cost optimization, and human receipts
- security boundaries: redaction, tenant guard, safe HTTP target checks, Redis sandbox, approval gates, rate limits, and risk scoring
- release hardening reports, consumer smoke tests, npm pack verification, and CI workflows

## CLI

```bash
stalezero preview UserUpdated --userId=123
stalezero snapshot UserUpdated --userId=123
stalezero lint --ci
stalezero prove receipt.json --ci
stalezero replay receipt.json --failed-only --safe-replay
stalezero explain-stale User:123
stalezero heatmap
stalezero optimize-cost
stalezero score
stalezero runbooks
```

Full command list: [CLI Guide](docs/cli.md).

## Mutation Studio

Devtools are the cockpit for local debugging:

- visual mutation graph
- receipt timeline
- target result table
- preview playground
- failed and slow target filters
- graph export as JSON, SVG, and HTML
- copy receipt JSON and reproduction snippets

Devtools are disabled by default in production handlers and should be protected with auth, CORS, payload limits, and redaction.

![Devtools screenshot](docs/assets/devtools-screenshot.svg)

## Production

StaleZero does not promise exactly-once distributed side effects. It helps teams build observable, idempotent consequence coordination.

| Mode | Semantics |
| --- | --- |
| `strict` | Required target failures make the receipt blocking and throw. |
| `best-effort` | Failures are recorded but do not throw. |
| `dry-run` | No adapter executes; the receipt is simulated. |
| required target | Failure changes receipt status. |
| optional target | Failure is recorded without blocking strict mode. |
| distributed mode | At-least-once or at-most-once depends on the chosen bus. Exactly-once is not guaranteed. |

Read these before production:

- [Production Guide](docs/production.md)
- [Failure Semantics](docs/failure-semantics.md)
- [Distributed Guarantees](docs/distributed-guarantees.md)
- [Security Model](docs/security-model.md)
- [Threat Model](docs/threat-model.md)
- [Known Limitations](docs/known-limitations.md)

## Docs

| Topic | Link |
| --- | --- |
| 60-second quickstart | [docs/quickstart.md](docs/quickstart.md) |
| Core concepts | [docs/concepts.md](docs/concepts.md) |
| Receipts | [docs/receipts.md](docs/receipts.md) |
| Receipt schema | [docs/receipt-schema.md](docs/receipt-schema.md) |
| Preview confidence | [docs/preview-confidence.md](docs/preview-confidence.md) |
| Failure semantics | [docs/failure-semantics.md](docs/failure-semantics.md) |
| Adapter tiers | [docs/adapter-tiers.md](docs/adapter-tiers.md) |
| Security boundaries | [docs/security-boundaries.md](docs/security-boundaries.md) |
| Production guide | [docs/production.md](docs/production.md) |
| API stability | [docs/api-stability.md](docs/api-stability.md) |
| Compatibility | [docs/compatibility.md](docs/compatibility.md) |
| Release checklist | [docs/release-checklist.md](docs/release-checklist.md) |

## Philosophy

StaleZero is not a cache library. It is not a queue. It is not a workflow engine. It is the small layer that lets a mutation say, in public, what it is about to touch and what actually happened afterward.

Own that receipt, and stale state becomes much easier to debug.
