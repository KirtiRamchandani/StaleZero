import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { createReceipt, receiptToText } from "../receipt.js";
import type { Receipt, ReceiptSnapshot, ReceiptStore } from "../types.js";

export type FileReceiptStoreOptions = {
  path: string;
  maxEntries?: number;
};

export class FileReceiptStore implements ReceiptStore {
  readonly #path: string;
  readonly #maxEntries?: number;
  readonly #cache = new Map<string, Receipt>();

  constructor(options: FileReceiptStoreOptions) {
    this.#path = options.path;
    this.#maxEntries = options.maxEntries;
  }

  async save(receipt: Receipt): Promise<void> {
    await mkdir(dirname(this.#path), { recursive: true });
    const snapshot = receipt.toJSON();
    await appendFile(this.#path, `${JSON.stringify(snapshot)}\n`, "utf8");
    this.#cache.set(receipt.id, receipt);
    if (this.#maxEntries) {
      await this.prune({ maxEntries: this.#maxEntries });
    }
  }

  async get(id: string): Promise<Receipt | undefined> {
    if (this.#cache.has(id)) {
      return this.#cache.get(id);
    }
    const receipts = await this.list();
    return receipts.find((receipt) => receipt.id === id);
  }

  async list(options: { limit?: number; mutation?: string } = {}): Promise<Receipt[]> {
    let receipts: Receipt[];
    try {
      const raw = await readFile(this.#path, "utf8");
      receipts = raw
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => hydrateReceipt(JSON.parse(line) as ReceiptSnapshot));
    } catch (error) {
      if (isMissingFile(error)) {
        receipts = [];
      } else {
        throw error;
      }
    }

    if (options.mutation) {
      receipts = receipts.filter((receipt) => receipt.mutation === options.mutation);
    }
    receipts.sort((left, right) => right.timestamp - left.timestamp);
    const limit = options.limit ?? receipts.length;
    const sliced = receipts.slice(0, limit);
    for (const receipt of sliced) {
      this.#cache.set(receipt.id, receipt);
    }
    return sliced;
  }

  async prune(options: { maxAgeMs?: number; maxEntries?: number } = {}): Promise<number> {
    const receipts = await this.list();
    const before = receipts.length;
    let kept = receipts;
    if (options.maxAgeMs) {
      const cutoff = Date.now() - options.maxAgeMs;
      kept = kept.filter((receipt) => receipt.timestamp >= cutoff);
    }
    if (options.maxEntries && kept.length > options.maxEntries) {
      kept = kept.slice(0, options.maxEntries);
    }
    if (kept.length !== before) {
      await mkdir(dirname(this.#path), { recursive: true });
      await writeFile(this.#path, `${kept.map((receipt) => JSON.stringify(receipt.toJSON())).join("\n")}${kept.length ? "\n" : ""}`, "utf8");
      this.#cache.clear();
    }
    return before - kept.length;
  }

  async export(options: { mutation?: string } = {}): Promise<Receipt[]> {
    return this.list({ mutation: options.mutation });
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

function isMissingFile(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "ENOENT");
}
