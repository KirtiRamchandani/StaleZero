import type { CostReport, RiskLevel, RiskResult, TargetRef } from "../types.js";
import { stableHash } from "./hashing.js";

export const riskOrder: RiskLevel[] = ["low", "medium", "high", "critical"];

export function compareRisk(left: RiskLevel, right: RiskLevel): number {
  return riskOrder.indexOf(left) - riskOrder.indexOf(right);
}

export function diffRisk(added: number, removed: number, rightRisk: RiskResult): RiskLevel {
  if (rightRisk.level === "critical" || removed > 10) {
    return "critical";
  }
  if (rightRisk.level === "high" || added + removed > 5) {
    return "high";
  }
  if (rightRisk.level === "medium" || added + removed > 0) {
    return "medium";
  }
  return "low";
}

export function estimateCost(targets: TargetRef[]): CostReport {
  const adapterCalls: Record<string, number> = {};
  let score = 0;
  let estimatedExternalCalls = 0;
  const reasons: string[] = [];
  for (const targetRef of targets) {
    adapterCalls[targetRef.adapter] = (adapterCalls[targetRef.adapter] ?? 0) + 1;
    score += targetRef.cost ?? 1;
    if (["http", "webhook", "search", "socket", "queue", "job"].includes(targetRef.adapter)) {
      estimatedExternalCalls += 1;
      score += 3;
    }
    if (targetRef.key.includes("*")) {
      score += 10;
    }
  }
  if (targets.length > 25) {
    reasons.push(`${targets.length} targets`);
  }
  if (estimatedExternalCalls > 0) {
    reasons.push(`${estimatedExternalCalls} external calls`);
  }
  if (targets.some((targetRef) => targetRef.key.includes("*"))) {
    reasons.push("wildcard target");
  }
  if (reasons.length === 0) {
    reasons.push("small local blast radius");
  }
  return {
    level: score >= 75 ? "high" : score >= 25 ? "medium" : "low",
    score,
    targets: targets.length,
    adapterCalls,
    estimatedExternalCalls,
    reasons
  };
}

export function rolloutBucket(seed: string): number {
  return Number.parseInt(stableHash(seed).slice(0, 8), 16) % 100;
}
