import type { HeatmapReport, OptimizationReport, Receipt, TargetRef } from "../types.js";
import { groupBy } from "./collections.js";
import { targetSignature } from "./targeting.js";

export function heatmapFromReceipts(receipts: Receipt[]): HeatmapReport {
  const mutationGroups = groupBy(receipts, (receipt) => receipt.mutation);
  const hotMutations = [...mutationGroups.entries()]
    .map(([mutation, group]) => ({
      mutation,
      count: group.length,
      failureRate: ratio(group.filter((receipt) => receipt.status === "failed" || receipt.status === "partial").length, group.length),
      p95Ms: percentile(group.map((receipt) => receipt.durationMs), 95),
      riskScore: Math.max(...group.map((receipt) => receipt.risk?.score ?? 0), 0),
      costScore: Math.max(...group.map((receipt) => receipt.cost?.score ?? 0), 0),
      owner: group.find((receipt) => receipt.owner)?.owner
    }))
    .sort((left, right) => right.count - left.count);
  const targetResults = receipts.flatMap((receipt) => receipt.results);
  const targetGroups = groupBy(targetResults, (result) => `${result.adapter}:${result.key}`);
  const slowTargets = [...targetGroups.entries()]
    .map(([targetName, group]) => ({
      target: targetName,
      count: group.length,
      p95Ms: percentile(group.map((result) => result.durationMs), 95),
      failureRate: ratio(group.filter((result) => result.status === "failed").length, group.length)
    }))
    .sort((left, right) => right.p95Ms - left.p95Ms);
  const adapterGroups = groupBy(targetResults, (result) => result.adapter);
  const adapterVolume = [...adapterGroups.entries()]
    .map(([adapter, group]) => ({
      adapter,
      count: group.length,
      failureRate: ratio(group.filter((result) => result.status === "failed").length, group.length)
    }))
    .sort((left, right) => right.count - left.count);
  return { hotMutations, slowTargets, adapterVolume };
}

export function optimizationSuggestions(receipts: Receipt[]): OptimizationReport["suggestions"] {
  const suggestions: OptimizationReport["suggestions"] = [];
  const allTargets = receipts.flatMap((receipt) => receipt.targets.map((targetRef) => ({ receipt, targetRef })));
  const targetGroups = groupBy(allTargets, (item) => targetSignature(item.targetRef));
  for (const [signature, group] of targetGroups) {
    if (group.length >= 3) {
      suggestions.push({
        title: `${signature} repeats across ${group.length} receipts`,
        suggestion: "coalesce this target for 250-500ms or batch it by adapter",
        estimatedReduction: Math.min(90, Math.round((1 - 1 / group.length) * 100)),
        target: signature
      });
    }
  }
  for (const receipt of receipts) {
    if (receipt.targets.length > 25) {
      suggestions.push({
        title: `${receipt.mutation} has a broad blast radius`,
        suggestion: "split targets into required and optional groups, then add field-level routing",
        estimatedReduction: 25,
        mutation: receipt.mutation
      });
    }
    if (receipt.targets.some((targetRef) => targetRef.adapter === "socket" && /all|tenant|broadcast/i.test(targetRef.key))) {
      suggestions.push({
        title: `${receipt.mutation} broadcasts a socket target`,
        suggestion: "narrow the room to the affected entity or actor",
        estimatedReduction: 40,
        mutation: receipt.mutation
      });
    }
  }
  return suggestions.slice(0, 10);
}

export function badgeSvg(label: string, message: string, color: string): string {
  const labelWidth = Math.max(72, label.length * 7 + 12);
  const messageWidth = Math.max(72, message.length * 7 + 12);
  const width = labelWidth + messageWidth;
  const safeLabel = escapeXml(label);
  const safeMessage = escapeXml(message);
  const safeColor = escapeXml(color);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="20" role="img" aria-label="${safeLabel}: ${safeMessage}"><linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient><rect rx="3" width="${width}" height="20" fill="#111827"/><rect rx="3" x="${labelWidth}" width="${messageWidth}" height="20" fill="${safeColor}"/><rect width="${width}" height="20" fill="url(#s)"/><g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,sans-serif" font-size="11"><text x="${Math.floor(labelWidth / 2)}" y="14">${safeLabel}</text><text x="${labelWidth + Math.floor(messageWidth / 2)}" y="14">${safeMessage}</text></g></svg>`;
}

export function humanTarget(targetRef: TargetRef): string {
  if (targetRef.adapter === "redis") return `Redis ${targetRef.key}`;
  if (targetRef.adapter === "query") return `query ${targetRef.key}`;
  if (targetRef.adapter === "next") return `Next ${targetRef.key}`;
  if (targetRef.adapter === "socket") return `socket room ${targetRef.key}`;
  if (targetRef.adapter === "search") return `search ${targetRef.key}`;
  return `${targetRef.adapter} ${targetRef.key}`;
}

export function percentile(values: number[], percentileRank: number): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.ceil((percentileRank / 100) * sorted.length) - 1);
  return sorted[index] ?? 0;
}

export function ratio(count: number, total: number): number {
  return total === 0 ? 0 : Number((count / total).toFixed(4));
}

export function escapeXml(value: string): string {
  return value.replace(/[<>&"]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[char] ?? char);
}
