import type { Receipt } from "./types.js";

export const STALEZERO_DOCS_BASE = "https://github.com/KirtiRamchandani/StaleZero/blob/main/docs";

export type StaleZeroErrorCode =
  | "VALIDATION_ERROR"
  | "UNKNOWN_MUTATION"
  | "SECURITY_BLOCKED"
  | "TIMEOUT"
  | "EXECUTION_FAILED"
  | "APPROVAL_REQUIRED"
  | "CONFIG_ERROR"
  | "TARGET_VALIDATION_ERROR"
  | "ADAPTER_EXECUTION_ERROR"
  | "TENANT_BOUNDARY_ERROR"
  | "PAYLOAD_TOO_LARGE"
  | "RECEIPT_STORE_ERROR"
  | "PROOF_ERROR";

export type StaleZeroErrorDetails = Record<string, unknown>;

export class StaleZeroError extends Error {
  readonly code: StaleZeroErrorCode;
  readonly details?: StaleZeroErrorDetails;
  readonly docsUrl?: string;

  constructor(
    code: StaleZeroErrorCode,
    message: string,
    options?: { details?: StaleZeroErrorDetails; docsPath?: string; cause?: unknown }
  ) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = "StaleZeroError";
    this.code = code;
    this.details = options?.details;
    this.docsUrl = options?.docsPath ? `${STALEZERO_DOCS_BASE}/${options.docsPath}` : undefined;
  }
}

export class StaleZeroValidationError extends StaleZeroError {
  constructor(message: string, details?: StaleZeroErrorDetails) {
    super("VALIDATION_ERROR", message, { details, docsPath: "concepts.md" });
    this.name = "StaleZeroValidationError";
  }
}

export class StaleZeroUnknownMutationError extends StaleZeroError {
  constructor(mutation: string, details?: StaleZeroErrorDetails) {
    super("UNKNOWN_MUTATION", `Unknown mutation "${mutation}". Register it with stale.mutation() or enable allowUndeclaredMutations.`, {
      details: { mutation, ...details },
      docsPath: "concepts.md"
    });
    this.name = "StaleZeroUnknownMutationError";
  }
}

export class StaleZeroSecurityError extends StaleZeroError {
  constructor(message: string, details?: StaleZeroErrorDetails) {
    super("SECURITY_BLOCKED", message, { details, docsPath: "security-boundaries.md" });
    this.name = "StaleZeroSecurityError";
  }
}

export class StaleZeroTimeoutError extends StaleZeroError {
  constructor(label: string, timeoutMs: number) {
    super("TIMEOUT", `${label} timed out after ${timeoutMs}ms`, {
      details: { label, timeoutMs },
      docsPath: "failure-semantics.md"
    });
    this.name = "StaleZeroTimeoutError";
  }
}

export class StaleZeroConfigError extends StaleZeroError {
  constructor(message: string, details?: StaleZeroErrorDetails) {
    super("CONFIG_ERROR", message, { details, docsPath: "production.md" });
    this.name = "StaleZeroConfigError";
  }
}

export class StaleZeroExecutionError extends StaleZeroError {
  readonly receipt: Receipt;

  constructor(receipt: Receipt) {
    super("EXECUTION_FAILED", `Mutation ${receipt.mutation} finished with status ${receipt.status}`, {
      details: { mutation: receipt.mutation, status: receipt.status, receiptId: receipt.id },
      docsPath: "failure-semantics.md"
    });
    this.name = "StaleZeroExecutionError";
    this.receipt = receipt;
  }
}

export class StaleZeroApprovalRequiredError extends StaleZeroError {
  constructor(mutation: string) {
    super("APPROVAL_REQUIRED", `Approval required for ${mutation}`, { details: { mutation }, docsPath: "security-boundaries.md" });
    this.name = "StaleZeroApprovalRequiredError";
  }
}

export class StaleZeroTenantBoundaryError extends StaleZeroError {
  constructor(message: string, details?: StaleZeroErrorDetails) {
    super("TENANT_BOUNDARY_ERROR", message, { details, docsPath: "security-boundaries.md" });
    this.name = "StaleZeroTenantBoundaryError";
  }
}

export class StaleZeroPayloadTooLargeError extends StaleZeroError {
  constructor(limitBytes: number) {
    super("PAYLOAD_TOO_LARGE", `Mutation input exceeds payload limit (${limitBytes} bytes)`, { details: { limitBytes }, docsPath: "production.md" });
    this.name = "StaleZeroPayloadTooLargeError";
  }
}

export class StaleZeroProofError extends StaleZeroError {
  constructor(message: string, details?: StaleZeroErrorDetails) {
    super("PROOF_ERROR", message, { details, docsPath: "proof-mode.md" });
    this.name = "StaleZeroProofError";
  }
}

export function isStaleZeroError(error: unknown): error is StaleZeroError {
  return error instanceof StaleZeroError;
}
