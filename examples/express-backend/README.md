# Express Backend Example

```ts
app.post("/users/:id", async (req, res) => {
  await db.user.update(req.params.id, req.body);
  const receipt = await stale.changed("UserUpdated", { userId: req.params.id });
  res.json({ ok: true, receipt: receipt.toJSON() });
});

app.use("/__stalezero", createExpressDevtoolsHandler(stale));
```
