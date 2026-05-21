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
```

`validate` checks duplicate targets and unsafe patterns. `doctor` checks package/runtime setup. `graph` emits graph output for documentation and devtools flows.
