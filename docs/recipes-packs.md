# Recipes And Packs

Recipes are installable graph starters. They use the normal public API and can be edited after installation.

```ts
import { createStaleZero } from "stalezero";
import { recipe } from "@stalezero/recipes";

const stale = createStaleZero();
await stale.useRecipe(recipe.productCatalog({
  redisPrefix: "product:",
  queryKey: (id) => ["product", id],
  nextTag: (id) => `product:${id}`,
  searchIndex: "products"
}));
```

Packs bundle domain defaults:

- `@stalezero/pack-saas`
- `@stalezero/pack-commerce`
- `@stalezero/pack-auth`

The CLI generator creates a starter mutation file, test file, and documentation page:

```bash
stalezero generate product-catalog
```
