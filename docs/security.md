# Security and Privacy

StaleZero should never become a second database of sensitive payloads. The default configuration redacts common secret keys before receipts are stored.

## Default redaction

The default receipt redaction keys are:

`password`, `token`, `secret`, `authorization`, `cookie`, `apiKey`, `email`

You can add keys or provide a custom function:

```ts
const stale = createStaleZero({
  receipts: {
    redact: ["password", "token", "customerEmail"],
    redactWith: (key, value) => key.endsWith("Id") ? value : "[redacted]"
  }
});
```

## Devtools safety

Devtools are disabled by default in production handlers. If you intentionally enable them, also configure:

- an `auth` hook,
- explicit CORS origins,
- a payload size limit,
- redaction keys,
- no raw business secrets in mutation inputs.

## HTTP signing

The HTTP webhook bus supports HMAC signatures, timestamp tolerance, replay protection, and idempotency headers. Use a different secret per environment and rotate it through your normal secret manager.

## Checklist

- Do not log raw mutation payloads.
- Store receipts only as long as support and audit workflows require them.
- Treat distributed event bodies as sensitive.
- Use server-only adapters on trusted runtimes.
- Do not expose devtools without authentication.
- Keep adapter credentials scoped to the smallest cache, queue, or index permissions they need.
