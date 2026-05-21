# StaleZero v0.1.0

First public release of StaleZero: a mutation consequence engine for cache invalidation, state sync, receipts, devtools, distributed events, and release-safe mutation graphs.

## Highlights

- Stable core API for `createStaleZero()`, `changed()`, `preview()`, `why()`, receipts, manifests, strict mode, best-effort mode, dry runs, replay, snapshots, contracts, workflows, inboxes, SLOs, rate limits, redaction, risk scoring, and security gates.
- Stable adapter surface for Redis, React Query, SWR, Redux, RTK Query, tRPC, Zustand, Apollo, Next cache revalidation, GraphQL, Cloudflare KV, HTTP, WebSocket, search, memory, and OpenTelemetry.
- Stable bus surface for memory, Redis, Postgres, HTTP webhooks, Kafka, and NATS.
- New 52-helper target catalog covering browser cache, CDN purge, CloudFront, Fastly, Vercel cache, Netlify cache, Cloudflare cache, edge config, image cache, sessions, cookies, local storage, broadcast channels, service workers, analytics, metrics, audit logs, email, SMS, push, webhooks, queues, topics, streams, search indexes, object storage, S3, blob storage, Prisma, Drizzle, TypeORM, Sequelize, Mongo, Postgres notify, outbox, dead letters, feature flags, permissions, roles, tenants, billing, Stripe, inventory, catalog, cart, checkout, orders, workflows, cron, Deno KV, and Bun SQLite.
- README polish with a cleaner opening, release badge, visual target map, feature catalog, package table, and launch-ready docs links.
- Package metadata now points at the public repository for every publishable package.

## Verification

- `npm run check`
- `npm run verify:api`
- `npm run verify:pack`
- `npm run verify:consumer`
- `npm run verify:cli`
- `npm run verify:security`
- `npm run verify:licenses`

CI is expected to run the full cross-platform matrix on push.
