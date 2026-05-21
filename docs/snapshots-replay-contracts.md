# Snapshots, Replay, And Contracts

Snapshots capture what a mutation affects before it runs.

```bash
stalezero snapshot UserUpdated --userId=123
```

The command writes `__stalezero_snapshots__/UserUpdated.snap.json`. Review tools can compare two snapshots or manifests and print added and removed targets.

Replay modes:

- `sandbox` never touches adapters and marks every target as skipped.
- `dry-run` calculates the same receipt shape without side effects.
- `safe-replay` only executes idempotent cache-style targets.
- `force` executes all original receipt targets and should be protected by policy.

Contract tests keep important mutation behavior stable:

```ts
await stale.contract("UserUpdated", {
  input: { userId: "123" },
  affects: [["User", "123"]],
  invalidates: ["redis:user:123"],
  maxRisk: "low"
});
```

The CLI reads `.stalezero/contracts.json` with `stalezero test-contracts`.
