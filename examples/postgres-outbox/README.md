# Postgres Outbox Demo

```ts
await client.query(POSTGRES_OUTBOX_SCHEMA);

await tx.query("UPDATE users SET name = $1 WHERE id = $2", [name, userId]);
await insertOutboxEvent(tx, {
  id: crypto.randomUUID(),
  app: "api",
  mutation: "UserUpdated",
  input: { userId },
  affected: [{ type: "User", id: userId }],
  timestamp: Date.now(),
  hops: 0
});
```
