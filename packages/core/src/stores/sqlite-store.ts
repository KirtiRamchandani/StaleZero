import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { createReceipt } from "../receipt.js";
import type { Receipt, ReceiptSnapshot, ReceiptStore } from "../types.js";

type SqliteDatabase = {
  exec: (sql: string) => void;
  prepare: (sql: string) => {
    run: (...params: unknown[]) => void;
    all: (...params: unknown[]) => Array<Record<string, unknown>>;
    get: (...params: unknown[]) => Record<string, unknown> | undefined;
  };
};

export type SqliteReceiptStoreOptions = {
  path: string;
  table?: string;
};

export class SqliteReceiptStore implements ReceiptStore {
  readonly #db: SqliteDatabase;
  readonly #table: string;

  constructor(db: SqliteDatabase, options: Pick<SqliteReceiptStoreOptions, "table"> = {}) {
    this.#db = db;
    this.#table = options.table ?? "stalezero_receipts";
    this.#ensureSchema();
  }

  static async open(options: SqliteReceiptStoreOptions): Promise<SqliteReceiptStore> {
    await mkdir(dirname(options.path), { recursive: true });
    const sqlite = await importNodeSqlite();
    const db = new sqlite.DatabaseSync(options.path);
    return new SqliteReceiptStore(db as unknown as SqliteDatabase, { table: options.table });
  }

  async save(receipt: Receipt): Promise<void> {
    const snapshot = receipt.toJSON();
    this.#db
      .prepare(
        `INSERT OR REPLACE INTO ${this.#table} (id, mutation, status, timestamp, payload)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(snapshot.id, snapshot.mutation, snapshot.status, snapshot.timestamp, JSON.stringify(snapshot));
  }

  async get(id: string): Promise<Receipt | undefined> {
    const row = this.#db.prepare(`SELECT payload FROM ${this.#table} WHERE id = ? LIMIT 1`).get(id);
    if (!row?.payload) {
      return undefined;
    }
    return hydrateReceipt(JSON.parse(String(row.payload)) as ReceiptSnapshot);
  }

  async list(options: { limit?: number; mutation?: string } = {}): Promise<Receipt[]> {
    const params: unknown[] = [];
    let sql = `SELECT payload FROM ${this.#table}`;
    if (options.mutation) {
      sql += " WHERE mutation = ?";
      params.push(options.mutation);
    }
    sql += " ORDER BY timestamp DESC";
    if (options.limit) {
      sql += " LIMIT ?";
      params.push(options.limit);
    }
    return this.#db
      .prepare(sql)
      .all(...params)
      .map((row) => hydrateReceipt(JSON.parse(String(row.payload)) as ReceiptSnapshot));
  }

  async prune(options: { maxAgeMs?: number; maxEntries?: number } = {}): Promise<number> {
    const before = Number(this.#db.prepare(`SELECT COUNT(*) AS count FROM ${this.#table}`).get()?.count ?? 0);
    if (options.maxAgeMs) {
      const cutoff = Date.now() - options.maxAgeMs;
      this.#db.prepare(`DELETE FROM ${this.#table} WHERE timestamp < ?`).run(cutoff);
    }
    if (options.maxEntries) {
      const total = Number(this.#db.prepare(`SELECT COUNT(*) AS count FROM ${this.#table}`).get()?.count ?? 0);
      if (total > options.maxEntries) {
        this.#db
          .prepare(
            `DELETE FROM ${this.#table}
             WHERE id IN (
               SELECT id FROM ${this.#table}
               ORDER BY timestamp ASC
               LIMIT ?
             )`
          )
          .run(total - options.maxEntries);
      }
    }
    const after = Number(this.#db.prepare(`SELECT COUNT(*) AS count FROM ${this.#table}`).get()?.count ?? 0);
    return Math.max(0, before - after);
  }

  async export(options: { mutation?: string } = {}): Promise<Receipt[]> {
    return this.list({ mutation: options.mutation });
  }

  #ensureSchema(): void {
    this.#db.exec(
      `CREATE TABLE IF NOT EXISTS ${this.#table} (
        id TEXT PRIMARY KEY,
        mutation TEXT NOT NULL,
        status TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        payload TEXT NOT NULL
      )`
    );
    this.#db.exec(`CREATE INDEX IF NOT EXISTS ${this.#table}_mutation_idx ON ${this.#table} (mutation)`);
    this.#db.exec(`CREATE INDEX IF NOT EXISTS ${this.#table}_timestamp_idx ON ${this.#table} (timestamp DESC)`);
  }
}

async function importNodeSqlite(): Promise<{ DatabaseSync: new (path: string) => unknown }> {
  try {
    return await import("node:sqlite");
  } catch (error) {
    throw new Error("SQLite receipt store requires Node.js 22+ with node:sqlite support", { cause: error });
  }
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
