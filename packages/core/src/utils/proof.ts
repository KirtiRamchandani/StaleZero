import type { ProofResult, StateProof } from "../types.js";

export function normalizeProofResult(
  result: boolean | string | ProofResult | { ok: boolean; message?: string; evidence?: unknown } | void
): ProofResult {
  if (result === true) {
    return { status: "confirmed" };
  }
  if (result === false || result === undefined) {
    return { status: "failed", message: result === undefined ? "verify returned no result" : undefined };
  }
  if (typeof result === "string") {
    return { status: "confirmed", message: result };
  }
  if ("status" in result) {
    return result;
  }
  return {
    status: result.ok ? "confirmed" : "failed",
    message: result.message,
    evidence: result.evidence
  };
}

export function proofRequiredFailure(proofs: StateProof[] | undefined): boolean {
  return Boolean(proofs?.some((proof) => proof.required && proof.status === "failed"));
}

export function proofStatusFrom(proofs: StateProof[] | undefined): ProofResult["status"] | undefined {
  if (!proofs) {
    return undefined;
  }
  if (proofs.some((proof) => proof.required && proof.status === "failed")) {
    return "failed";
  }
  if (proofs.some((proof) => proof.status === "confirmed")) {
    return "confirmed";
  }
  return "skipped";
}
