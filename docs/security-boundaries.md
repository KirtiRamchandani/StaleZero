# Security Boundaries

StaleZero can block risky mutation execution before adapters run.

```ts
stale
  .security({
    mode: "strict",
    requireActor: true,
    requireTenantBoundary: true,
    blockUnsafeTargets: true
  })
  .tenant({
    actorTenant: ({ actor }) => actor.tenantId,
    inputTenant: ({ input }) => input.tenantId,
    blockCrossTenant: true
  })
  .sandbox("redis", {
    allowedPrefixes: ["user:", "product:", "team:"],
    denyPatterns: ["*", "secret:*"],
    maxKeysPerMutation: 50
  })
  .risk({ block: "critical", requireApproval: "high" });
```

Boundaries include:

- actor and schema requirements
- tenant mismatch blocking
- HTTP target URL safety
- Redis prefix and wildcard controls
- secret redaction for receipts and devtools
- approval gates for high-risk mutations
- per-mutation rate limits
- black box recording with safe payload summaries

Use `stalezero doctor --supply-chain` to check local release and workflow hygiene.
