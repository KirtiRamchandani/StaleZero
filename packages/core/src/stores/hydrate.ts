import { createReceipt } from "../receipt.js";
import type { Receipt, ReceiptSnapshot } from "../types.js";

export function hydrateReceipt(snapshot: ReceiptSnapshot): Receipt {
  return createReceipt({
    id: snapshot.id,
    mutation: snapshot.mutation,
    payload: snapshot.input,
    affected: snapshot.affected,
    targets: snapshot.targets,
    results: snapshot.results,
    status: snapshot.status,
    durationMs: snapshot.durationMs,
    timestamp: snapshot.timestamp,
    app: snapshot.app,
    traceId: snapshot.traceId,
    owner: snapshot.owner,
    actor: snapshot.actor,
    tenant: snapshot.tenant,
    environment: snapshot.environment,
    risk: snapshot.risk,
    slo: snapshot.slo,
    proofs: snapshot.proofs,
    proofStatus: snapshot.proofStatus,
    flow: snapshot.flow,
    undo: snapshot.undo,
    cost: snapshot.cost,
    freshness: snapshot.freshness,
    changedFields: snapshot.changedFields,
    rollout: snapshot.rollout,
    shadow: snapshot.shadow,
    approval: snapshot.approval,
    hash: snapshot.hash,
    schemaVersion: snapshot.schemaVersion
  });
}
