# Security Model

StaleZero touches sensitive surfaces: cache keys, webhook URLs, event payloads, receipts, devtools, and replay commands.

Threats to design for:

- leaking sensitive data in receipts
- cross-tenant invalidation
- malicious or overly broad HTTP targets
- devtools exposure
- replay abuse
- approval bypass
- receipt tampering
- wildcard cache purges

Recommended boundaries:

- default redaction for `password`, `token`, `secret`, `authorization`, `cookie`, `apiKey`, and `email`
- tenant guard for multi-tenant mutations
- safe HTTP target allowlists
- Redis/cache sandbox rules
- approval gates for high-risk mutations
- replay authorization
- payload size limits
- devtools auth, CORS, and production disablement
- durable audit receipts for critical mutations

Run:

```bash
stalezero lint --ci
stalezero doctor --supply-chain
```

Security rules should be visible in code and reviewed with the mutation graph.

