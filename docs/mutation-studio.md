# Mutation Studio

Mutation Studio is the cockpit view for a StaleZero graph. It is enabled from the core instance:

```ts
stale.devtools({
  studio: true,
  preview: true,
  replay: true,
  compare: true
});
```

Studio surfaces the manifest graph, recent receipts, target results, failed or slow adapters, risk status, and replay-safe snippets. The server handler stays opt-in so production apps can keep devtools disabled unless an explicit route and auth policy are configured.

Core support includes:

- visual graph data from `generateManifest()` and `compileManifest()`
- mutation preview through `preview()` and `snapshot()`
- receipt replay through `replay(receipt, { mode })`
- blast-radius comparison through `compareSnapshots()`
- black box entries through `blackbox()` and `blackboxEntries()`

Export paths are JSON through manifests and receipts, SVG/HTML through the CLI graph command, and runnable reproduction snippets through generated recipe files.
