# Bus Template

```ts
import type { EventBus, StaleEvent } from "@stalezero/core";

export function exampleBus(client: ExampleBusClient): EventBus {
  return {
    name: "example-bus",
    publish: (event: StaleEvent) => client.publish(JSON.stringify(event)),
    subscribe: async (handler) => {
      const unsubscribe = await client.subscribe(async (message) => {
        const event = JSON.parse(message) as StaleEvent;
        await handler({ ...event, hops: event.hops + 1 });
      });
      return unsubscribe;
    }
  };
}
```

Bus checklist:

- Event id preserved.
- Hop count incremented on receive.
- Unsubscribe function returned.
- Publish and subscribe tested with a fake client.
