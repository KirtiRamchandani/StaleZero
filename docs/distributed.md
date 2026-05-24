# Distributed Mode

Distributed mode publishes mutation events to a bus. Each process runs the adapters it owns.

Distributed mode is consequence coordination, not magic consistency. Delivery semantics depend on the bus and store you choose. See [Distributed Guarantees](distributed-guarantees.md) before production use.

```ts
const stale = createStaleZero({
  app: "billing",
  distributed: {
    enabled: true,
    ignoreSelf: true,
    maxHops: 3
  }
});

stale.useBus(memoryBus());
```

Available bus packages:

- `@stalezero/memory-bus`
- `@stalezero/redis-bus`
- `@stalezero/postgres-bus`
- `@stalezero/http-bus`
- `@stalezero/kafka-bus`
- `@stalezero/nats-bus`

Events carry a receipt id, mutation name, input, affected entities, trace id, timestamp, and hop count.

## Redis Streams

`redisStreamBus()` can publish to a stream and subscribe through `xRead`/`xread` compatible clients:

```ts
stale.useBus(redisStreamBus({
  client,
  stream: "stalezero.events",
  startId: "$"
}));
```

## Postgres Outbox

The Postgres package includes schema, insert, fetch, replay, mark-processed, mark-failed, and cleanup helpers:

```ts
await insertOutboxEvent(client, event);
await replayOutbox(client, async (event) => {
  await stale.changed(event.mutation, event.input, {
    idempotencyKey: event.id,
    publish: false
  });
});
await cleanupOutbox(client, { olderThanDays: 14 });
```

## Loop and duplicate controls

The core engine dedupes event IDs, honors `ignoreSelf`, and stops events when `maxHops` is reached. The memory and HTTP buses also provide local dedupe so tests and webhooks can reject repeats before they re-enter the engine.
