# Outbox Mode

The Postgres package includes the starter table for transactional outbox storage:

```sql
CREATE TABLE IF NOT EXISTS stalezero_outbox (
  id UUID PRIMARY KEY,
  app TEXT NOT NULL,
  mutation TEXT NOT NULL,
  payload JSONB NOT NULL,
  affected JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);
```

Use `insertOutboxEvent(client, event)` inside an existing transaction when a service needs reliable handoff to a worker.
