# Known Limitations

- StaleZero does not infer dependencies automatically. You declare mutations, affected entities, and targets.
- StaleZero does not guarantee impossible distributed exactly-once execution.
- StaleZero does not replace Redis, Redux, React Query, SWR, Next.js cache APIs, queues, or databases.
- Stale data can still exist if adapters are misconfigured or unavailable.
- Some adapters are server-only, including Next.js cache revalidation.
- Distributed mode reliability depends on the chosen bus.
- Devtools can expose receipt data if enabled without redaction or auth.
- Experimental adapters may change before 1.0.
- CJS `require()` is not supported; use ESM or dynamic `import()`.
- Proof mode depends on adapter `verify()` implementations. A skipped proof means the adapter did not prove the effect.
- Preview confidence can be `estimated`, `unsafe`, or `unknown`; do not treat those as exact production guarantees.
- Business workflows are beta. Use idempotency, authorization, and compensation rules before running destructive steps.
- Adapter maturity is tiered. Check [Adapter Tiers](adapter-tiers.md) before treating an adapter as production-ready.
