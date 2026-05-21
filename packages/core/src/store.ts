import type { Receipt, ReceiptStore } from "./types.js";

export class MemoryReceiptStore implements ReceiptStore {
  readonly #receipts = new Map<string, Receipt>();
  readonly #sequence = new Map<string, number>();
  #nextSequence = 0;

  save(receipt: Receipt): void {
    this.#receipts.set(receipt.id, receipt);
    this.#nextSequence += 1;
    this.#sequence.set(receipt.id, this.#nextSequence);
  }

  get(id: string): Receipt | undefined {
    return this.#receipts.get(id);
  }

  list(options: { limit?: number; mutation?: string } = {}): Receipt[] {
    let receipts = [...this.#receipts.values()].sort((left, right) => this.#compareNewestFirst(left, right));
    if (options.mutation) {
      receipts = receipts.filter((receipt) => receipt.mutation === options.mutation);
    }
    return receipts.slice(0, options.limit ?? receipts.length);
  }

  prune(options: { maxAgeMs?: number; maxEntries?: number } = {}): number {
    const before = this.#receipts.size;
    const maxAgeMs = options.maxAgeMs;
    const maxEntries = options.maxEntries;
    if (maxAgeMs) {
      const cutoff = Date.now() - maxAgeMs;
      for (const [id, receipt] of this.#receipts) {
        if (receipt.timestamp < cutoff) {
          this.#receipts.delete(id);
          this.#sequence.delete(id);
        }
      }
    }
    if (maxEntries && this.#receipts.size > maxEntries) {
      const receipts = [...this.#receipts.values()].sort((left, right) => this.#compareNewestFirst(left, right));
      for (const receipt of receipts.slice(maxEntries)) {
        this.#receipts.delete(receipt.id);
        this.#sequence.delete(receipt.id);
      }
    }
    return before - this.#receipts.size;
  }

  export(options: { mutation?: string } = {}): Receipt[] {
    return this.list({ mutation: options.mutation });
  }

  #compareNewestFirst(left: Receipt, right: Receipt): number {
    return right.timestamp - left.timestamp || (this.#sequence.get(right.id) ?? 0) - (this.#sequence.get(left.id) ?? 0);
  }
}
