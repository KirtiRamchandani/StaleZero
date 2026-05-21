# ADR 0001: ESM First

## Decision

StaleZero packages are ESM-first and do not support CommonJS `require()`.

## Rationale

The core should stay small, tree-shakeable, and aligned with modern TypeScript package exports.

## Consequences

CommonJS consumers can use dynamic import:

```js
const { createStaleZero } = await import("stalezero");
```
