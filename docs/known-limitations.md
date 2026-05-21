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
