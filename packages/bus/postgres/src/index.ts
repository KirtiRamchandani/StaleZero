import type { EventBus, StaleEvent } from "@stalezero/core";

export type PgClientLike = {
  query: (sql: string, params?: unknown[]) => Promise<{ rows?: unknown[] }> | { rows?: unknown[] };
  on?: (event: "notification", handler: (message: { channel: string; payload?: string }) => void) => unknown;
};

export const POSTGRES_OUTBOX_SCHEMA = `
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
`;

export function postgresNotifyBus(options: { client: PgClientLike; channel?: string; name?: string }): EventBus {
  const channel = options.channel ?? "stalezero_events";
  return {
    name: options.name ?? "postgres-notify",
    publish: async (event) => {
      await options.client.query("SELECT pg_notify($1, $2)", [channel, JSON.stringify(event)]);
    },
    subscribe: async (handler) => {
      if (!options.client.on) {
        throw new Error("Postgres client does not expose notification events");
      }
      const listener = (message: { channel: string; payload?: string }) => {
        if (message.channel === channel && message.payload) {
          const event = JSON.parse(message.payload) as StaleEvent;
          void handler({ ...event, hops: event.hops + 1 });
        }
      };
      options.client.on("notification", listener);
      await options.client.query(`LISTEN ${channel}`);
      return async () => {
        await options.client.query(`UNLISTEN ${channel}`);
      };
    }
  };
}

export async function insertOutboxEvent(client: PgClientLike, event: StaleEvent): Promise<void> {
  await client.query(
    `INSERT INTO stalezero_outbox (id, app, mutation, payload, affected)
     VALUES ($1, $2, $3, $4::jsonb, $5::jsonb)`,
    [event.id.replace(/^rcp_/, ""), event.app ?? "app", event.mutation, JSON.stringify(event.input), JSON.stringify(event.affected)]
  );
}

export async function fetchPendingOutboxEvents(client: PgClientLike, options: { limit?: number } = {}): Promise<StaleEvent[]> {
  const result = await client.query(
    `SELECT id, app, mutation, payload, affected, created_at
     FROM stalezero_outbox
     WHERE status = 'pending'
     ORDER BY created_at ASC
     LIMIT $1`,
    [options.limit ?? 100]
  );
  return (result.rows ?? []).map((row) => {
    const record = row as Record<string, unknown>;
    return {
      id: String(record.id),
      app: String(record.app ?? "app"),
      mutation: String(record.mutation),
      input: record.payload,
      affected: Array.isArray(record.affected) ? (record.affected as StaleEvent["affected"]) : [],
      timestamp: record.created_at ? new Date(String(record.created_at)).getTime() : Date.now(),
      hops: 0
    };
  });
}

export async function markOutboxEventProcessed(client: PgClientLike, id: string): Promise<void> {
  await client.query(`UPDATE stalezero_outbox SET status = 'processed', processed_at = now() WHERE id = $1`, [id]);
}

export async function markOutboxEventFailed(client: PgClientLike, id: string): Promise<void> {
  await client.query(`UPDATE stalezero_outbox SET status = 'failed', attempts = attempts + 1 WHERE id = $1`, [id]);
}

export async function cleanupOutbox(client: PgClientLike, options: { olderThanDays?: number } = {}): Promise<void> {
  await client.query(`DELETE FROM stalezero_outbox WHERE status = 'processed' AND processed_at < now() - ($1::text || ' days')::interval`, [
    String(options.olderThanDays ?? 14)
  ]);
}

export async function replayOutbox(client: PgClientLike, handler: (event: StaleEvent) => Promise<void> | void, options: { limit?: number } = {}): Promise<void> {
  const events = await fetchPendingOutboxEvents(client, options);
  for (const event of events) {
    try {
      await handler(event);
      await markOutboxEventProcessed(client, event.id);
    } catch {
      await markOutboxEventFailed(client, event.id);
    }
  }
}
