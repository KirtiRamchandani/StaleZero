# create-stalezero

Scaffold a production-ready StaleZero application with mutations, receipts, tests, and CI.

## Usage

```bash
npm create stalezero@latest my-app
# or
npx create-stalezero my-app --app=api --environment=production
```

## Generated layout

- `src/stalezero.ts` — engine bootstrap with production preset
- `src/mutations.ts` — example mutation graph
- `src/run.ts` — CLI entry for local mutation runs
- `stalezero.config.json` — app metadata
- `.github/workflows/stalezero.yml` — graph lint + contract checks
