# Observability

The OpenTelemetry package turns receipts into spans and adapter results into child spans.

## Span names

| Span | Name |
| --- | --- |
| Mutation receipt | `stalezero.mutation.<MutationName>` |
| Adapter result | `stalezero.adapter` |

## Attributes

| Attribute | Description |
| --- | --- |
| `stalezero.receipt.id` | Receipt and event correlation ID. |
| `stalezero.mutation` | Mutation name. |
| `stalezero.status` | Receipt status. |
| `stalezero.duration_ms` | Mutation duration. |
| `stalezero.targets` | Target count. |
| `stalezero.failures` | Failure count. |
| `stalezero.adapter` | Adapter name on child spans. |
| `stalezero.target.key` | Adapter target key. |

## Console exporter example

```ts
import { createStaleZero } from "@stalezero/core";
import { createOpenTelemetryHooks } from "@stalezero/otel";

const tracer = trace.getTracer("api");
const stale = createStaleZero({
  hooks: createOpenTelemetryHooks(tracer)
});
```

## OTLP exporter example

Configure the OpenTelemetry SDK in your service, then pass its tracer to `createOpenTelemetryHooks`. StaleZero does not own process-wide tracing setup; it only emits spans for mutation receipts and adapter execution.
