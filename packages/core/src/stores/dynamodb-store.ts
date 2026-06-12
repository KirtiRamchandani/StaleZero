import type { Receipt, ReceiptListOptions, ReceiptSnapshot, ReceiptStore } from "../types.js";
import { filterReceipts } from "./filter.js";
import { hydrateReceipt } from "./hydrate.js";

export type DynamoDbReceiptClient = {
  put: (params: { TableName: string; Item: Record<string, unknown> }) => Promise<unknown>;
  get: (params: { TableName: string; Key: Record<string, unknown> }) => Promise<{ Item?: Record<string, unknown> }>;
  scan?: (params: {
    TableName: string;
    FilterExpression?: string;
    ExpressionAttributeValues?: Record<string, unknown>;
    Limit?: number;
  }) => Promise<{ Items?: Array<Record<string, unknown>> }>;
  query?: (params: {
    TableName: string;
    IndexName?: string;
    KeyConditionExpression: string;
    ExpressionAttributeValues: Record<string, unknown>;
    Limit?: number;
  }) => Promise<{ Items?: Array<Record<string, unknown>> }>;
  delete?: (params: { TableName: string; Key: Record<string, unknown> }) => Promise<unknown>;
};

export type DynamoDbReceiptStoreOptions = {
  client: DynamoDbReceiptClient;
  table: string;
  mutationIndex?: string;
  maxEntries?: number;
};

export class DynamoDbReceiptStore implements ReceiptStore {
  readonly #client: DynamoDbReceiptClient;
  readonly #table: string;
  readonly #mutationIndex?: string;
  readonly #maxEntries?: number;

  constructor(options: DynamoDbReceiptStoreOptions) {
    this.#client = options.client;
    this.#table = options.table;
    this.#mutationIndex = options.mutationIndex;
    this.#maxEntries = options.maxEntries;
  }

  async save(receipt: Receipt): Promise<void> {
    const snapshot = receipt.toJSON();
    await this.#client.put({
      TableName: this.#table,
      Item: {
        id: snapshot.id,
        mutation: snapshot.mutation,
        status: snapshot.status,
        timestamp: snapshot.timestamp,
        actor: snapshot.actor,
        tenant: snapshot.tenant,
        payload: JSON.stringify(snapshot)
      }
    });
    if (this.#maxEntries) {
      await this.prune({ maxEntries: this.#maxEntries });
    }
  }

  async get(id: string): Promise<Receipt | undefined> {
    const result = await this.#client.get({ TableName: this.#table, Key: { id } });
    if (!result.Item?.payload) {
      return undefined;
    }
    return hydrateReceipt(JSON.parse(String(result.Item.payload)) as ReceiptSnapshot);
  }

  async list(options: ReceiptListOptions = {}): Promise<Receipt[]> {
    let items: Array<Record<string, unknown>> = [];
    if (options.mutation && this.#mutationIndex && this.#client.query) {
      const result = await this.#client.query({
        TableName: this.#table,
        IndexName: this.#mutationIndex,
        KeyConditionExpression: "mutation = :mutation",
        ExpressionAttributeValues: { ":mutation": options.mutation },
        Limit: options.limit
      });
      items = result.Items ?? [];
    } else if (this.#client.scan) {
      const result = await this.#client.scan({
        TableName: this.#table,
        Limit: options.limit ? options.limit * 4 : undefined
      });
      items = result.Items ?? [];
    } else {
      throw new Error("DynamoDB receipt store requires scan() or query() with mutationIndex");
    }
    const receipts = items.map((item) => hydrateReceipt(JSON.parse(String(item.payload)) as ReceiptSnapshot));
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
        await this.#client.delete({ TableName: this.#table, Key: { id: receipt.id } });
        removed += 1;
      }
    }
    return removed || before - kept.length;
  }

  async export(options: ReceiptListOptions = {}): Promise<Receipt[]> {
    return this.list(options);
  }
}
