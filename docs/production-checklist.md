# Production Checklist

Use this checklist before shipping StaleZero in production.

## Engine configuration

- [ ] Use `createStaleZero.production()` or `mode: "production"`
- [ ] Set `allowUndeclaredMutations: false` (default in production preset)
- [ ] Register a durable receipt store (`FileReceiptStore`, `SqliteReceiptStore`, or `PostgresReceiptStore`)
- [ ] Configure `security({ blockUnsafeTargets: true })` if not using the production preset
- [ ] Set mutation owners and schemas for every production mutation
- [ ] Add approval gates for destructive or tenant-scoped mutations

## Adapters and targets

- [ ] Register only adapters you actually use
- [ ] Block Redis wildcard deletes unless sandbox allowlists are explicit
- [ ] Require HTTPS and host allowlists for HTTP/webhook targets
- [ ] Mark optional targets as `required: false` when failures should not block strict mode
- [ ] Enable adapter `verify()` hooks for critical targets and run `stalezero prove` in CI

## Devtools

- [ ] Keep devtools disabled in production (`enabledInProduction: false`) or require `auth()`
- [ ] Enable redaction for receipts, devtools, and bus payloads
- [ ] Protect preview endpoints with auth and payload limits

## Observability

- [ ] Wire OpenTelemetry hooks or metrics (`@stalezero/otel`)
- [ ] Store receipts with `schemaVersion` and optional `hash` for audit trails
- [ ] Monitor mutation duration, target failures, and proof status
- [ ] Run `stalezero drift` or scheduled drift scans for high-risk entities

## CI and governance

- [ ] Run `stalezero lint --ci` on every PR
- [ ] Run `stalezero release-check` before releases
- [ ] Use the mutation-diff GitHub Action for manifest changes
- [ ] Keep `verify:api` and adapter conformance in your release pipeline
- [ ] Document runbooks per mutation (`stalezero runbooks`)

## Security review

- [ ] Read [security-model.md](./security-model.md) and [threat-model.md](./threat-model.md)
- [ ] Confirm tenant boundaries for multi-tenant apps
- [ ] Verify redaction covers tokens, JWTs, emails, and payment data
- [ ] Confirm no devtools or receipt exports leak sensitive payloads

## Release sign-off

- [ ] `npm run verify:rc` passes locally
- [ ] Example stack (Next.js + Redis + React Query) smoke-tested
- [ ] Rollback path documented: replay failed targets with `stalezero replay --safe-replay`
