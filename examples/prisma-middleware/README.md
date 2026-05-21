# Prisma Middleware Example

```ts
prisma.$use(async (params, next) => {
  const result = await next(params);

  if (params.model === "User" && ["update", "delete"].includes(params.action)) {
    await stale.changed("UserUpdated", {
      userId: String(params.args.where.id)
    });
  }

  return result;
});
```
