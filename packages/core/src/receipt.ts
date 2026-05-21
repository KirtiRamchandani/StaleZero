import type { EntityRef, ExecutionResult, Receipt, ReceiptSnapshot, ReceiptStatus, TargetRef } from "./types.js";

export function createReceipt(input: {
  id: string;
  mutation: string;
  payload: unknown;
  affected: EntityRef[];
  targets: TargetRef[];
  results: ExecutionResult[];
  status: ReceiptStatus;
  durationMs: number;
  timestamp: number;
  app?: string;
  traceId?: string;
  risk?: Receipt["risk"];
  slo?: Receipt["slo"];
  approval?: Receipt["approval"];
}): Receipt {
  const snapshot: ReceiptSnapshot = {
    id: input.id,
    mutation: input.mutation,
    input: input.payload,
    affected: input.affected,
    targets: input.targets,
    results: input.results,
    status: input.status,
    durationMs: input.durationMs,
    timestamp: input.timestamp,
    app: input.app,
    traceId: input.traceId,
    risk: input.risk,
    slo: input.slo,
    approval: input.approval
  };

  return {
    ...snapshot,
    toJSON: () => ({ ...snapshot, affected: [...snapshot.affected], targets: [...snapshot.targets], results: [...snapshot.results] }),
    toText: () => receiptToText(snapshot),
    hasFailures: () => snapshot.results.some((result) => result.status === "failed"),
    hasBlockingFailures: () => snapshot.results.some((result) => result.status === "failed" && result.target.required !== false),
    assertSuccess: () => {
      if (snapshot.status !== "success" && snapshot.status !== "dry-run" && snapshot.results.some((result) => result.status === "failed" && result.target.required !== false)) {
        throw new Error(`Mutation ${snapshot.mutation} finished with status ${snapshot.status}`);
      }
    }
  };
}

export function receiptToText(receipt: ReceiptSnapshot): string {
  const lines = [
    `${receipt.mutation} ${receipt.status === "dry-run" ? "previewed" : "completed"}.`,
    "",
    "Affected:"
  ];

  if (receipt.affected.length === 0) {
    lines.push("- none declared");
  } else {
    for (const ref of receipt.affected) {
      lines.push(`- ${ref.type}:${ref.id}`);
    }
  }

  lines.push("", receipt.status === "dry-run" ? "Would execute:" : "Executed:");

  if (receipt.targets.length === 0) {
    lines.push("- no targets matched");
  } else if (receipt.results.length === 0) {
    for (const target of receipt.targets) {
      lines.push(`- ${target.adapter} ${target.key} ${target.action}`);
    }
  } else {
    for (const result of receipt.results) {
      const marker = result.status === "success" ? "ok" : result.status;
      const suffix = result.error ? `: ${result.error.message}` : result.skippedReason ? `: ${result.skippedReason}` : "";
      const batch = result.batch ? ` batch=${result.batch.size}` : "";
      const coalesced = result.coalesced ? ` coalesced=${result.coalesced.count}` : "";
      lines.push(`- ${marker} ${result.adapter} ${result.key} ${result.action} (${result.durationMs}ms)${batch}${coalesced}${suffix}`);
    }
  }

  if (receipt.risk) {
    lines.push("", `Risk: ${receipt.risk.level}`);
    for (const reason of receipt.risk.reasons) {
      lines.push(`- ${reason}`);
    }
  }

  if (receipt.slo) {
    lines.push("", `SLO: ${receipt.slo.status}`);
    for (const check of receipt.slo.checks) {
      lines.push(`- ${check.status} ${check.name}${check.message ? `: ${check.message}` : ""}`);
    }
  }

  lines.push("", `Status: ${receipt.status}`, `Duration: ${receipt.durationMs}ms`);
  return lines.join("\n");
}
