# Devtools

Devtools turn receipts and manifests into a local timeline, target table, graph export, preview playground, why view, and static share view.

## Web handler

```ts
import { createDevtoolsWebHandler } from "@stalezero/devtools";

const handler = createDevtoolsWebHandler(stale, {
  auth: (request) => request.headers.get("authorization") === `Bearer ${process.env.DEVTOOLS_TOKEN}`,
  cors: { origin: "https://admin.example.com" },
  payloadLimitBytes: 64_000,
  redact: ["token", "email"]
});
```

Devtools are disabled by default when `NODE_ENV=production`. Pass `enabledInProduction: true` only with authentication, CORS, and redaction.

## Endpoints

| Endpoint | Purpose |
| --- | --- |
| `/timeline.json` | Receipt timeline. |
| `/receipt.json` | Export receipt JSON. |
| `/failures.json` | Failed invalidations. |
| `/slow.json` | Slow adapter timing. |
| `/events.json` | Distributed event log. |
| `/outbox.json` | Outbox queue view. |
| `/graph.json` | Manifest graph JSON. |
| `/graph.svg` | Static graph image. |
| `/preview` | Preview playground. |
| `/why` | Why mode. |
| `/static.html` | Redaction-safe static share view. |

Use query params `q`, `mutation`, `status`, and `slowMs` to filter views.
