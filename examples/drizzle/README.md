# Drizzle Example

```ts
await db.transaction(async (tx) => {
  await tx.update(users).set(data).where(eq(users.id, userId));
  await stale.changed("UserUpdated", { userId });
});
```
