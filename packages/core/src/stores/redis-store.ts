import { createReceipt } from "../receipt.js";
import type { Receipt, ReceiptListOptions, ReceiptSnapshot, ReceiptStore } from "../types.js";
import { filterReceipts } from "./filter.js";

export type RedisReceiptClient = {
  lPush?: (key: string, ...values: string[]) => Promise<number> | number;
  lpush?: (key: string, ...values: string[]) => Promise<number> | number;
  lRange?: (key: string, start: number, stop: number) => Promise<string[]> | string[];
  lrange?: (key: string, start: number, stop: number) => Promise<string[]> | string[];
  lTrim?: (key: string, start: number, stop: number) => Promise<unknown> | unknown;
  ltrim?: (key: string, start: number, stop: number) => Promise<unknown> | unknown;
  hSet?: (key: string, field: string, value: string) => Promise<unknown> | unknown;
  hset?: (key: string, field: string, value: string) => Promise<unknown> | unknown;
  hGet?: (key: string, field: string) => Promise<string | null> | string | null;
  hget?: (key: string, field: string) => Promise<string | null> | string | null;
};

export type RedisReceiptStoreOptions = {
  client: RedisReceiptClient;
  key?: string;
  maxEntries?: number;
};

export class RedisReceiptStore implements ReceiptStore {
  readonly #client: RedisReceiptClient;
  readonly #key: string;
  readonly #maxEntries?: number;

  constructor(options: RedisReceiptStoreOptions) {
    this.#client = options.client;
    this.#key = options.key ?? "stalezero:receipts";
    this.#maxEntries = options.maxEntries;
  }

  async save(receipt: Receipt): Promise<void> {
    const snapshot = receipt.toJSON();
    const payload = JSON.stringify(snapshot);
    const push = this.#client.lPush ?? this.#client.lpush;
    const hSet = this.#client.hSet ?? this.#client.hset;
    if (!push || !hSet) {
      throw new Error("Redis receipt store requires lPush/lpush and hSet/hset");
    }
    await hSet(this.#key, snapshot.id, payload);
    await push(`${this.#key}:index`, snapshot.id);
    if (this.#maxEntries) {
      await this.prune({ maxEntries: this.#maxEntries });
    }
  }

  async get(id: string): Promise<Receipt | undefined> {
    const hGet = this.#client.hGet ?? this.#client.hget;
    if (!hGet) {
      throw new Error("Redis receipt store requires hGet/hget");
    }
    const raw = await hGet(this.#key, id);
    if (!raw) {
      return undefined;
    }
    return hydrateReceipt(JSON.parse(raw) as ReceiptSnapshot);
  }

  async list(options: ReceiptListOptions = {}): Promise<Receipt[]> {
    const lRange = this.#client.lRange ?? this.#client.lrange;
    const hGet = this.#client.hGet ?? this.#client.hget;
    if (!lRange || !hGet) {
      throw new Error("Redis receipt store requires lRange/lrange and hGet/hget");
    }
    const ids = await lRange(`${this.#key}:index`, 0, -1);
    const receipts: Receipt[] = [];
    for (const id of ids) {
      const raw = await hGet(this.#key, id);
      if (raw) {
        receipts.push(hydrateReceipt(JSON.parse(raw) as ReceiptSnapshot));
      }
    }
    return filterReceipts(receipts, options);
  }

  async prune(options: { maxAgeMs?: number; maxEntries?: number } = {}): Promise<number> {
    const before = (await this.list()).length;
    let kept = await this.list();
    if (options.maxAgeMs) {
      const cutoff = Date.now() - options.maxAgeMs;
      kept = kept.filter((receipt) => receipt.timestamp >= cutoff);
    }
    if (options.maxEntries && kept.length > options.maxEntries) {
      kept = kept.slice(0, options.maxEntries);
    }
    if (kept.length === before) {
      return 0;
    }
    const lTrim = this.#client.lTrim ?? this.#client.ltrim;
    const hSet = this.#client.hSet ?? this.#client.hset;
    const push = this.#client.lPush ?? this.#client.lpush;
    if (!lTrim || !hSet || !push) {
      throw new Error("Redis receipt store requires lTrim/ltrim, hSet/hset, and lPush/lpush");
    }
    await lTrim(`${this.#key}:index`, 0, -1);
    for (const receipt of kept) {
      const snapshot = receipt.toJSON();
      await hSet(this.#key, snapshot.id, JSON.stringify(snapshot));
      await push(`${this.#key}:index`, snapshot.id);
    }
    return before - kept.length;
  }

  async export(options: ReceiptListOptions = {}): Promise<Receipt[]> {
    return this.list(options);
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
    actor: snapshot.actor,
    tenant: snapshot.tenant,
    environment: snapshot.environment,
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
    hash: snapshot.hash,
    schemaVersion: snapshot.schemaVersion
  });
}
