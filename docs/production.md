# Production Guide

Use best-effort mode when invalidation should never fail the user request:

```ts
await stale.changed("UserUpdated", input, {
  consistency: "best-effort"
});
```

Use strict mode when every target must succeed:

```ts
await stale.changed("PlanChanged", input, {
  consistency: "strict"
});
```

Add reliability controls for production adapters:

```ts
const stale = createStaleZero({
  execution: {
    timeoutMs: 3000,
    retries: 2,
    retry: { backoffMs: 100, maxBackoffMs: 2000, jitter: true },
    concurrency: 10,
    rateLimitPerSecond: 50,
    circuitBreaker: { enabled: true, failureThreshold: 5, cooldownMs: 30_000 }
  },
  receipts: {
    retentionMs: 1000 * 60 * 60 * 24 * 14,
    maxEntries: 50_000
  }
});
```

Protect logs by redacting sensitive fields:

```ts
const stale = createStaleZero({
  receipts: {
    redact: ["email", "token", "password"]
  }
});
```

Use a bus when different services own different adapters:

```ts
stale.useBus(redisPubSubBus({
  publisher,
  subscriber,
  channel: "stalezero.events"
}));
```

Run `await stale.ready()` during startup, expose `await stale.health()` to readiness checks, and call `await stale.shutdown()` during graceful process shutdown.

See also [Production Reliability](reliability.md), [Security and Privacy](security.md), and [Threat Model](threat-model.md).
