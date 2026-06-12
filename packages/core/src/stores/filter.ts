import type { Receipt, ReceiptListOptions } from "../types.js";

export function filterReceipts(receipts: Receipt[], options: ReceiptListOptions = {}): Receipt[] {
  let filtered = [...receipts];
  if (options.mutation) {
    filtered = filtered.filter((receipt) => receipt.mutation === options.mutation);
  }
  if (options.status) {
    filtered = filtered.filter((receipt) => receipt.status === options.status);
  }
  if (options.actor) {
    filtered = filtered.filter((receipt) => receipt.actor === options.actor);
  }
  if (options.tenant) {
    filtered = filtered.filter((receipt) => receipt.tenant === options.tenant);
  }
  filtered.sort((left, right) => right.timestamp - left.timestamp);
  return filtered.slice(0, options.limit ?? filtered.length);
}
