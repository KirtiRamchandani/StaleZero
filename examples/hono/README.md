# Hono Example

```ts
app.post("/users/:id", async (c) => {
  const body = await c.req.json();
  await db.user.update(c.req.param("id"), body);
  const receipt = await stale.changed("UserUpdated", { userId: c.req.param("id") });
  return c.json(receipt.toJSON());
});
```
