import type { EntityRef, ExecutionResult, Receipt, ReceiptSnapshot, ReceiptStatus, TargetRef } from "./types.js";
import { RECEIPT_SCHEMA_VERSION } from "./types.js";

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
  environment?: string;
  actor?: string;
  tenant?: string;
  traceId?: string;
  owner?: Receipt["owner"];
  risk?: Receipt["risk"];
  slo?: Receipt["slo"];
  proofs?: Receipt["proofs"];
  proofStatus?: Receipt["proofStatus"];
  flow?: Receipt["flow"];
  undo?: Receipt["undo"];
  cost?: Receipt["cost"];
  freshness?: Receipt["freshness"];
  changedFields?: Receipt["changedFields"];
  rollout?: Receipt["rollout"];
  shadow?: Receipt["shadow"];
  approval?: Receipt["approval"];
  hash?: string;
  schemaVersion?: number;
}): Receipt {
  const snapshot: ReceiptSnapshot = {
    schemaVersion: input.schemaVersion ?? RECEIPT_SCHEMA_VERSION,
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
    environment: input.environment,
    actor: input.actor,
    tenant: input.tenant,
    traceId: input.traceId,
    owner: input.owner,
    risk: input.risk,
    slo: input.slo,
    proofs: input.proofs,
    proofStatus: input.proofStatus,
    flow: input.flow,
    undo: input.undo,
    cost: input.cost,
    freshness: input.freshness,
    changedFields: input.changedFields,
    rollout: input.rollout,
    shadow: input.shadow,
    approval: input.approval,
    hash: input.hash
  };

  return {
    ...snapshot,
    toJSON: () => ({ ...snapshot, affected: [...snapshot.affected], targets: [...snapshot.targets], results: [...snapshot.results] }),
    toText: () => receiptToText(snapshot),
    toMarkdown: () => receiptToMarkdown(snapshot),
    toSlack: () => receiptToSlack(snapshot),
    toMermaid: () => receiptToMermaid(snapshot),
    toHtml: () => receiptToHtml(snapshot),
    toGitHubComment: () => receiptToGitHubComment(snapshot),
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

  if (receipt.proofs?.length) {
    lines.push("", `Proof${receipt.proofStatus ? `: ${receipt.proofStatus}` : ""}:`);
    for (const proof of receipt.proofs) {
      lines.push(`- ${proof.status} ${proof.adapter} ${proof.key}${proof.message ? `: ${proof.message}` : ""}`);
    }
  }

  if (receipt.freshness) {
    lines.push("", `Freshness: ${receipt.freshness.status}`);
    for (const check of receipt.freshness.checks) {
      lines.push(`- ${check.status} ${check.name}: ${check.actualMs}ms / ${check.maxStaleMs}ms`);
    }
  }

  if (receipt.changedFields?.length) {
    lines.push("", "Changed fields:", ...receipt.changedFields.map((field) => `- ${field}`));
  }

  if (receipt.rollout) {
    lines.push("", `Rollout: ${receipt.rollout.name} ${receipt.rollout.active ? "active" : "inactive"}`);
  }

  if (receipt.shadow?.length) {
    lines.push("", "Shadow:");
    for (const shadow of receipt.shadow) {
      lines.push(`- ${shadow.name}: +${shadow.added.length} -${shadow.removed.length}`);
    }
  }

  if (receipt.cost) {
    lines.push("", `Cost: ${receipt.cost.level} (${receipt.cost.score})`);
    for (const reason of receipt.cost.reasons) {
      lines.push(`- ${reason}`);
    }
  }

  if (receipt.flow) {
    lines.push("", `Flow: ${receipt.flow.name} ${receipt.flow.status}`);
    for (const step of receipt.flow.steps) {
      lines.push(`- ${step.status} ${step.name} (${step.durationMs}ms)`);
    }
  }

  lines.push("", `Status: ${receipt.status}`, `Duration: ${receipt.durationMs}ms`, `Schema: v${receipt.schemaVersion}`);
  return lines.join("\n");
}

export function receiptToMarkdown(receipt: ReceiptSnapshot): string {
  const text = receiptToText(receipt);
  return [
    `# Receipt ${receipt.id}`,
    "",
    `- Mutation: \`${receipt.mutation}\``,
    `- Status: **${receipt.status}**`,
    `- Duration: ${receipt.durationMs}ms`,
    `- Schema: v${receipt.schemaVersion}`,
    receipt.traceId ? `- Trace: \`${receipt.traceId}\`` : "",
    "",
    "```txt",
    text,
    "```"
  ]
    .filter(Boolean)
    .join("\n");
}

export function receiptToSlack(receipt: ReceiptSnapshot): string {
  const failures = receipt.results.filter((result) => result.status === "failed").length;
  const emoji = receipt.status === "success" ? ":white_check_mark:" : receipt.status === "dry-run" ? ":eyes:" : ":warning:";
  return [
    `${emoji} *${receipt.mutation}* ${receipt.status}`,
    `Targets: ${receipt.targets.length} | Failures: ${failures} | Duration: ${receipt.durationMs}ms`,
    receipt.risk ? `Risk: ${receipt.risk.level}` : "",
    receipt.proofStatus ? `Proof: ${receipt.proofStatus}` : ""
  ]
    .filter(Boolean)
    .join("\n");
}

export function receiptToMermaid(receipt: ReceiptSnapshot): string {
  const lines = ["flowchart TD", `mutation["${escapeMermaid(receipt.mutation)}"]`];
  receipt.targets.forEach((target, index) => {
    const node = `t${index}["${escapeMermaid(`${target.adapter}:${target.action}`)}"]`;
    lines.push(node, `mutation --> ${node}`);
    const result = receipt.results.find((item) => item.adapter === target.adapter && item.key === target.key && item.action === target.action);
    if (result) {
      const resultNode = `r${index}["${result.status}"]`;
      lines.push(resultNode, `t${index} --> ${resultNode}`);
    }
  });
  return lines.join("\n");
}

export function receiptToHtml(receipt: ReceiptSnapshot): string {
  const rows = receipt.results
    .map(
      (result) =>
        `<tr><td>${result.status}</td><td>${result.adapter}</td><td>${escapeHtml(result.key)}</td><td>${result.action}</td><td>${result.durationMs}ms</td></tr>`
    )
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"/><title>Receipt ${escapeHtml(receipt.id)}</title><style>body{font:14px system-ui,sans-serif;margin:24px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #d0d7de;padding:8px;text-align:left}</style></head><body><h1>${escapeHtml(receipt.mutation)}</h1><p>Status: <strong>${receipt.status}</strong> | Duration: ${receipt.durationMs}ms | Schema: v${receipt.schemaVersion}</p><table><thead><tr><th>Status</th><th>Adapter</th><th>Key</th><th>Action</th><th>Duration</th></tr></thead><tbody>${rows}</tbody></table><pre>${escapeHtml(receiptToText(receipt))}</pre></body></html>`;
}

export function receiptToGitHubComment(receipt: ReceiptSnapshot): string {
  const failures = receipt.results.filter((result) => result.status === "failed");
  return [
    `### ${receipt.mutation} receipt \`${receipt.id}\``,
    "",
    `- Status: **${receipt.status}**`,
    `- Duration: ${receipt.durationMs}ms`,
    `- Targets: ${receipt.targets.length}`,
    `- Failures: ${failures.length}`,
    receipt.hash ? `- Hash: \`${receipt.hash}\`` : "",
    "",
    "<details><summary>Executed targets</summary>",
    "",
    "```txt",
    receiptToText(receipt),
    "```",
    "",
    "</details>"
  ]
    .filter(Boolean)
    .join("\n");
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function escapeMermaid(value: string): string {
  return value.replace(/"/g, "'");
}
