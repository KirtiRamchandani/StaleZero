import { createHmac } from "node:crypto";
import type { ReceiptSnapshot } from "../types.js";
import { isRecord } from "./collections.js";

export function stableHash(value: unknown): string {
  const input = JSON.stringify(value, Object.keys(isRecord(value) ? value : {}).sort());
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16);
}

export function computeReceiptHash(snapshot: ReceiptSnapshot, previousHash?: string): string {
  const payload = {
    schemaVersion: snapshot.schemaVersion,
    id: snapshot.id,
    mutation: snapshot.mutation,
    input: snapshot.input,
    affected: snapshot.affected,
    targets: snapshot.targets,
    results: snapshot.results,
    status: snapshot.status,
    timestamp: snapshot.timestamp,
    previousHash
  };
  return stableHash(payload);
}

export function verifyReceiptHash(
  snapshot: ReceiptSnapshot & { hash?: string; previousHash?: string },
  options: { previousHash?: string } = {}
): boolean {
  if (!snapshot.hash) {
    return false;
  }
  const expected = computeReceiptHash(snapshot, options.previousHash ?? snapshot.previousHash);
  return snapshot.hash === expected;
}

export function signReceiptHash(hash: string, secret: string): string {
  return createHmac("sha256", secret).update(hash).digest("hex");
}

export function verifyReceiptIntegrity(
  snapshot: ReceiptSnapshot & { hash?: string; signature?: string; previousHash?: string },
  options: { secret?: string; previousHash?: string } = {}
): { valid: boolean; reason?: string } {
  if (!verifyReceiptHash(snapshot, options)) {
    return { valid: false, reason: snapshot.hash ? "hash mismatch" : "missing hash" };
  }
  if (options.secret && snapshot.signature) {
    const expectedSignature = signReceiptHash(snapshot.hash!, options.secret);
    if (snapshot.signature !== expectedSignature) {
      return { valid: false, reason: "signature mismatch" };
    }
  }
  return { valid: true };
}
