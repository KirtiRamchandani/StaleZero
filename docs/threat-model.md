# Threat Model

## Assets

- Mutation inputs.
- Receipts and adapter results.
- Distributed event payloads.
- Adapter credentials.
- Devtools endpoints.

## Main risks

| Risk | Mitigation |
| --- | --- |
| Secret data stored in receipts | Default and custom redaction. |
| Devtools data exposed publicly | Production disabled by default, auth hook, CORS controls. |
| HTTP event spoofing | HMAC signatures and timestamp tolerance. |
| HTTP replay | Event ID dedupe and timestamp tolerance. |
| Adapter overreach | Permission guide and adapter-specific credentials. |
| Distributed loops | `ignoreSelf`, event dedupe, and `maxHops`. |
| Oversized payload abuse | `payloadLimitBytes` and devtools payload limits. |

## Non-goals

StaleZero does not provide exactly-once distributed execution, secret storage, authentication for your application, or a replacement for queue-level access controls.
