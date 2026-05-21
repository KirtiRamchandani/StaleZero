# Memory Adapter Example

The memory adapter records calls for tests and local demos.

```ts
const memory = memoryAdapter();
const stale = createStaleZero().use(memory);

await stale.mutate("ThingChanged", {}).target(memoryTarget("thing:1")).run();

console.log(memory.calls);
```
