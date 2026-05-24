# CLI

The CLI is built output first. Smoke tests execute `packages/cli/dist/index.js` rather than source files.

```bash
npx stalezero init
npx stalezero validate
npx stalezero doctor
npx stalezero preview UserUpdated '{"userId":"123"}'
npx stalezero graph
npx stalezero devtools
npx stalezero manifest
npx stalezero receipt <id>
npx stalezero why ReactQueryUser
npx stalezero list mutations
npx stalezero list targets
npx stalezero replay receipt.json --target=redis:delete:user:123
npx stalezero prove receipt.json --ci
npx stalezero lint --ci
npx stalezero explain-stale User:123
npx stalezero undo receipt.json
npx stalezero playbook receipt.json
npx stalezero incident receipt.json
npx stalezero canary ProductPriceChanged --productId=p1
npx stalezero drift User 123
npx stalezero contract-check
npx stalezero schema check
npx stalezero watch --once
npx stalezero cost ProductPriceChanged --productId=p1
npx stalezero heatmap
npx stalezero optimize-cost
npx stalezero score
npx stalezero badge
npx stalezero ownership-map
npx stalezero runbooks
npx stalezero browser-helper
npx stalezero scan src
npx stalezero scan duplicates src
npx stalezero diagnostics
```

`validate` checks duplicate targets and unsafe patterns. `doctor` checks package/runtime setup. `graph` emits graph output for documentation and devtools flows.

## Operations Commands

| Command | Purpose |
| --- | --- |
| `replay` | Replays a receipt in sandbox, dry-run, safe, or force mode with target, adapter, failed-only, required-only, and safe-only filters. |
| `prove` | Runs proof checks for a receipt and can fail CI on required proof failures. |
| `lint` | Runs graph architecture checks from the manifest. |
| `explain-stale` | Uses receipt history and the manifest to explain likely stale-data causes. |
| `undo` | Previews reversible mutation undo work and can run safe undo invalidations with `--force`. |
| `playbook` | Turns a receipt into deterministic recovery steps. |
| `incident` | Converts a receipt into an incident note with impact and timeline. |
| `canary` | Runs a dry-run wiring check and readiness score. |
| `drift` | Scans an entity for graph drift using registered probes or receipt history. |
| `contract-check` | Checks event producer and consumer schemas from `.stalezero/service-contracts.json`. |
| `schema` | Generates schema docs and diffs from `.stalezero/schemas.json`. |
| `watch` | Prints a live receipt feed from `.stalezero/receipts`. |
| `cost` | Estimates target count, adapter calls, external calls, and cost level. |
| `heatmap` | Reports hot mutations, slow targets, and adapter volume from local receipts. |
| `optimize-cost` | Suggests coalescing, batching, and narrower targets from receipt history. |
| `score` | Calculates a project readiness score. |
| `badge` | Writes `.stalezero/badge.svg`. |
| `ownership-map` | Writes `.stalezero/ownership.json`. |
| `runbooks` | Generates runbooks for manifest mutations. |
| `browser-helper` | Writes the dev-only browser stale-data helper script. |
| `scan` | Finds manual invalidation patterns or repeated invalidation clusters. |
| `diagnostics` | Writes `.stalezero/diagnostics.json` for editor hints. |
