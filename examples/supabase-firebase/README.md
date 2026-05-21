# Supabase and Firebase Example

Emit source-changed events from application code after writes.

```ts
await supabase.from("users").update(data).eq("id", userId);
await stale.changed("UserUpdated", { userId });
```

```ts
await updateDoc(doc(db, "users", userId), data);
await stale.changed("UserUpdated", { userId });
```
