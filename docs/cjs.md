# CommonJS Compatibility

StaleZero is ESM-first. Package exports generate `.d.ts` files and ESM JavaScript.

CommonJS consumers can load it with dynamic import:

```js
const { createStaleZero } = await import("stalezero");
```

The project keeps this decision explicit so the core remains small and tree-shakeable.
