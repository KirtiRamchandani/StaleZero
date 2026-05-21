# Adapter Template

You can create a starter package with:

```bash
npx create-stalezero-adapter-template ./my-adapter --package=@acme/stalezero-adapter --adapter=acmeAdapter --target=acme
```

```ts
import type { Adapter, TargetRef } from "@stalezero/core";

export function exampleAdapter(client: ExampleClient): Adapter<TargetRef<"example">> {
  return {
    name: "example",
    execute: async (target, context) => {
      if (target.action !== "invalidate") {
        throw new Error(`Unsupported action for example adapter: ${target.action}`);
      }
      await client.invalidate(target.key, {
        receipt: context.id,
        mutation: context.mutation
      });
    }
  };
}

export function exampleTarget(key: string): TargetRef<"example"> {
  return { adapter: "example", key, action: "invalidate" };
}
```

Adapter checklist:

- Target helper included.
- Contract test included.
- Missing client/config errors are clear.
- Unsupported actions fail clearly.
- README example included.
