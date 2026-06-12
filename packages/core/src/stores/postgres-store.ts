import { createReceipt } from "../receipt.js";
import type { Receipt, ReceiptSnapshot, ReceiptStore } from "../types.js";

export type PostgresQueryClient = {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>;
};

export type PostgresReceiptStoreOptions = {
  client: PostgresQueryClient;
  table?: string;
  ensureSchema?: boolean;
};

export class PostgresReceiptStore implements ReceiptStore {
  readonly #client: PostgresQueryClient;
  readonly #table: string;

  constructor(options: PostgresReceiptStoreOptions) {
    this.#client = options.client;
    this.#table = options.table ?? "stalezero_receipts";
    if (options.ensureSchema !== false) {
      void this.#ensureSchema();
    }
  }

  async save(receipt: Receipt): Promise<void> {
    const snapshot = receipt.toJSON();
    await this.#client.query(
      `INSERT INTO ${this.#table} (id, mutation, status, timestamp, payload)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       ON CONFLICT (id) DO UPDATE SET mutation = EXCLUDED.mutation, status = EXCLUDED.status, timestamp = EXCLUDED.timestamp, payload = EXCLUDED.payload`,
      [snapshot.id, snapshot.mutation, snapshot.status, snapshot.timestamp, JSON.stringify(snapshot)]
    );
  }

  async get(id: string): Promise<Receipt | undefined> {
    const result = await this.#client.query(`SELECT payload FROM ${this.#table} WHERE id = $1 LIMIT 1`, [id]);
    const row = result.rows[0];
    if (!row?.payload) {
      return undefined;
    }
    return hydrateReceipt(parsePayload(row.payload));
  }

  async list(options: { limit?: number; mutation?: string } = {}): Promise<Receipt[]> {
    const params: unknown[] = [];
    let sql = `SELECT payload FROM ${this.#table}`;
    if (options.mutation) {
      params.push(options.mutation);
      sql += ` WHERE mutation = $${params.length}`;
    }
    sql += " ORDER BY timestamp DESC";
    if (options.limit) {
      params.push(options.limit);
      sql += ` LIMIT $${params.length}`;
    }
    const result = await this.#client.query(sql, params);
    return result.rows.map((row) => hydrateReceipt(parsePayload(row.payload)));
  }

  async prune(options: { maxAgeMs?: number; maxEntries?: number } = {}): Promise<number> {
    let removed = 0;
    if (options.maxAgeMs) {
      const cutoff = Date.now() - options.maxAgeMs;
      const result = await this.#client.query(`DELETE FROM ${this.#table} WHERE timestamp < $1`, [cutoff]);
      removed += Number(result.rows.length ?? 0);
    }
    if (options.maxEntries) {
      const count = await this.#client.query(`SELECT COUNT(*)::int AS count FROM ${this.#table}`);
      const total = Number(count.rows[0]?.count ?? 0);
      if (total > options.maxEntries) {
        await this.#client.query(
          `DELETE FROM ${this.#table}
           WHERE id IN (
             SELECT id FROM ${this.#table}
             ORDER BY timestamp ASC
             LIMIT $1
           )`,
          [total - options.maxEntries]
        );
        removed += total - options.maxEntries;
      }
    }
    return removed;
  }

  async export(options: { mutation?: string } = {}): Promise<Receipt[]> {
    return this.list({ mutation: options.mutation });
  }

  async #ensureSchema(): Promise<void> {
    await this.#client.query(
      `CREATE TABLE IF NOT EXISTS ${this.#table} (
        id TEXT PRIMARY KEY,
        mutation TEXT NOT NULL,
        status TEXT NOT NULL,
        timestamp BIGINT NOT NULL,
        payload JSONB NOT NULL
      )`
    );
    await this.#client.query(`CREATE INDEX IF NOT EXISTS ${this.#table}_mutation_idx ON ${this.#table} (mutation)`);
    await this.#client.query(`CREATE INDEX IF NOT EXISTS ${this.#table}_timestamp_idx ON ${this.#table} (timestamp DESC)`);
  }
}

function parsePayload(value: unknown): ReceiptSnapshot {
  if (typeof value === "string") {
    return JSON.parse(value) as ReceiptSnapshot;
  }
  return value as ReceiptSnapshot;
}

function hydrateReceipt(snapshot: ReceiptSnapshot): Receipt {
  return createReceipt({
    id: snapshot.id,
    mutation: snapshot.mutation,
    payload: snapshot.input,
    affected: snapshot.affected,
    targets: snapshot.targets,
    results: snapshot.results,
    status: snapshot.status,
    durationMs: snapshot.durationMs,
    timestamp: snapshot.timestamp,
    app: snapshot.app,
    traceId: snapshot.traceId,
    owner: snapshot.owner,
    risk: snapshot.risk,
    slo: snapshot.slo,
    proofs: snapshot.proofs,
    proofStatus: snapshot.proofStatus,
    flow: snapshot.flow,
    undo: snapshot.undo,
    cost: snapshot.cost,
    freshness: snapshot.freshness,
    changedFields: snapshot.changedFields,
    rollout: snapshot.rollout,
    shadow: snapshot.shadow,
    approval: snapshot.approval,
    schemaVersion: snapshot.schemaVersion
  });
}
