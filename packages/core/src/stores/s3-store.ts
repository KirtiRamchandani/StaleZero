import type { Receipt, ReceiptListOptions, ReceiptSnapshot, ReceiptStore } from "../types.js";
import { filterReceipts } from "./filter.js";
import { hydrateReceipt } from "./hydrate.js";

export type S3ReceiptClient = {
  putObject: (params: { Bucket: string; Key: string; Body: string; ContentType?: string }) => Promise<unknown>;
  getObject: (params: { Bucket: string; Key: string }) => Promise<{ Body?: string | Uint8Array }>;
  listObjectsV2: (params: { Bucket: string; Prefix: string; MaxKeys?: number }) => Promise<{ Contents?: Array<{ Key?: string }> }>;
  deleteObject?: (params: { Bucket: string; Key: string }) => Promise<unknown>;
};

export type S3ReceiptStoreOptions = {
  client: S3ReceiptClient;
  bucket: string;
  prefix?: string;
  maxEntries?: number;
};

export class S3ReceiptStore implements ReceiptStore {
  readonly #client: S3ReceiptClient;
  readonly #bucket: string;
  readonly #prefix: string;
  readonly #maxEntries?: number;

  constructor(options: S3ReceiptStoreOptions) {
    this.#client = options.client;
    this.#bucket = options.bucket;
    this.#prefix = options.prefix ?? "stalezero/receipts/";
    this.#maxEntries = options.maxEntries;
  }

  async save(receipt: Receipt): Promise<void> {
    const snapshot = receipt.toJSON();
    await this.#client.putObject({
      Bucket: this.#bucket,
      Key: this.#objectKey(snapshot.id),
      Body: JSON.stringify(snapshot),
      ContentType: "application/json"
    });
    if (this.#maxEntries) {
      await this.prune({ maxEntries: this.#maxEntries });
    }
  }

  async get(id: string): Promise<Receipt | undefined> {
    try {
      const result = await this.#client.getObject({ Bucket: this.#bucket, Key: this.#objectKey(id) });
      const body = decodeBody(result.Body);
      if (!body) {
        return undefined;
      }
      return hydrateReceipt(JSON.parse(body) as ReceiptSnapshot);
    } catch {
      return undefined;
    }
  }

  async list(options: ReceiptListOptions = {}): Promise<Receipt[]> {
    const listed = await this.#client.listObjectsV2({ Bucket: this.#bucket, Prefix: this.#prefix });
    const receipts: Receipt[] = [];
    for (const item of listed.Contents ?? []) {
      if (!item.Key || item.Key.endsWith("/")) {
        continue;
      }
      const result = await this.#client.getObject({ Bucket: this.#bucket, Key: item.Key });
      const body = decodeBody(result.Body);
      if (body) {
        receipts.push(hydrateReceipt(JSON.parse(body) as ReceiptSnapshot));
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
    const keptIds = new Set(kept.map((receipt) => receipt.id));
    const all = await this.list();
    let removed = 0;
    for (const receipt of all) {
      if (!keptIds.has(receipt.id) && this.#client.deleteObject) {
        await this.#client.deleteObject({ Bucket: this.#bucket, Key: this.#objectKey(receipt.id) });
        removed += 1;
      }
    }
    return removed || before - kept.length;
  }

  async export(options: ReceiptListOptions = {}): Promise<Receipt[]> {
    return this.list(options);
  }

  #objectKey(id: string): string {
    return `${this.#prefix}${id}.json`;
  }
}

function decodeBody(body: string | Uint8Array | undefined): string | undefined {
  if (!body) {
    return undefined;
  }
  return typeof body === "string" ? body : new TextDecoder().decode(body);
}
