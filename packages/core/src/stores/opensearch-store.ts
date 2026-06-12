import type { Receipt, ReceiptListOptions, ReceiptSnapshot, ReceiptStore } from "../types.js";
import { filterReceipts } from "./filter.js";
import { hydrateReceipt } from "./hydrate.js";

export type OpenSearchReceiptClient = {
  index: (params: { index: string; id: string; body: Record<string, unknown>; refresh?: boolean }) => Promise<unknown>;
  get: (params: { index: string; id: string }) => Promise<{ _source?: Record<string, unknown>; found?: boolean }>;
  search: (params: { index: string; body: Record<string, unknown> }) => Promise<{
    hits: { hits: Array<{ _source?: Record<string, unknown> }> };
  }>;
  delete?: (params: { index: string; id: string }) => Promise<unknown>;
};

export type OpenSearchReceiptStoreOptions = {
  client: OpenSearchReceiptClient;
  index: string;
  maxEntries?: number;
};

export class OpenSearchReceiptStore implements ReceiptStore {
  readonly #client: OpenSearchReceiptClient;
  readonly #index: string;
  readonly #maxEntries?: number;

  constructor(options: OpenSearchReceiptStoreOptions) {
    this.#client = options.client;
    this.#index = options.index;
    this.#maxEntries = options.maxEntries;
  }

  async save(receipt: Receipt): Promise<void> {
    const snapshot = receipt.toJSON();
    await this.#client.index({
      index: this.#index,
      id: snapshot.id,
      body: snapshot as unknown as Record<string, unknown>,
      refresh: true
    });
    if (this.#maxEntries) {
      await this.prune({ maxEntries: this.#maxEntries });
    }
  }

  async get(id: string): Promise<Receipt | undefined> {
    const result = await this.#client.get({ index: this.#index, id });
    if (!result._source) {
      return undefined;
    }
    return hydrateReceipt(result._source as unknown as ReceiptSnapshot);
  }

  async list(options: ReceiptListOptions = {}): Promise<Receipt[]> {
    const must: Array<Record<string, unknown>> = [];
    if (options.mutation) {
      must.push({ term: { mutation: options.mutation } });
    }
    if (options.status) {
      must.push({ term: { status: options.status } });
    }
    if (options.actor) {
      must.push({ term: { actor: options.actor } });
    }
    if (options.tenant) {
      must.push({ term: { tenant: options.tenant } });
    }
    const result = await this.#client.search({
      index: this.#index,
      body: {
        size: options.limit ?? 100,
        sort: [{ timestamp: "desc" }],
        query: must.length ? { bool: { must } } : { match_all: {} }
      }
    });
    const receipts = result.hits.hits
      .map((hit) => hit._source)
      .filter((source): source is Record<string, unknown> => Boolean(source))
      .map((source) => hydrateReceipt(source as unknown as ReceiptSnapshot));
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
    const keptIds = new Set(kept.map((receipt) => receipt.id));
    const all = await this.list();
    let removed = 0;
    for (const receipt of all) {
      if (!keptIds.has(receipt.id) && this.#client.delete) {
        await this.#client.delete({ index: this.#index, id: receipt.id });
        removed += 1;
      }
    }
    return removed || before - kept.length;
  }

  async export(options: ReceiptListOptions = {}): Promise<Receipt[]> {
    return this.list(options);
  }
}
