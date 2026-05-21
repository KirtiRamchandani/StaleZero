# Distributed Redis Pub/Sub Demo

```ts
const stale = createStaleZero({
  app: "api",
  distributed: { enabled: true, ignoreSelf: true, maxHops: 3 }
});

stale.useBus(redisPubSubBus({ publisher, subscriber }));
```

Each process registers only the adapters it owns.
