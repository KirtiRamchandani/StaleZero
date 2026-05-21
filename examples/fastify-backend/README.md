# Fastify Backend Example

```ts
fastify.post("/users/:id", async (request) => {
  await db.user.update(request.params.id, request.body);
  return (await stale.changed("UserUpdated", { userId: request.params.id })).toJSON();
});

fastify.get("/__stalezero/*", createFastifyDevtoolsHandler(stale));
```
