import type { MutationSnapshotData, RiskLevel, ServiceContract } from "../types.js";
import { targetSignature } from "./targeting.js";

export function snapshotToText(snapshot: MutationSnapshotData): string {
  return [
    `Snapshot: ${snapshot.mutation}`,
    "",
    "Affected:",
    ...(snapshot.affected.length ? snapshot.affected.map((ref) => `- ${ref.type}:${ref.id}`) : ["- none declared"]),
    "",
    "Targets:",
    ...(snapshot.targets.length ? snapshot.targets.map((targetRef) => `- ${targetSignature(targetRef)}`) : ["- no targets"]),
    "",
    `Risk: ${snapshot.risk.level}`
  ].join("\n");
}

export function snapshotDiffToText(diff: { mutation: string; added: string[]; removed: string[]; unchanged: string[]; risk: RiskLevel }): string {
  return [
    `Mutation blast radius changed: ${diff.mutation}`,
    "",
    "Removed:",
    ...(diff.removed.length ? diff.removed.map((item) => `- ${item}`) : ["- none"]),
    "",
    "Added:",
    ...(diff.added.length ? diff.added.map((item) => `- ${item}`) : ["- none"]),
    "",
    `Risk: ${diff.risk}`
  ].join("\n");
}

export function schemaDiff(event: string, from: ServiceContract["schema"] | undefined, to: ServiceContract["schema"] | undefined): {
  event: string;
  from?: ServiceContract["schema"];
  to?: ServiceContract["schema"];
  breaking: boolean;
  changes: string[];
  toText: () => string;
} {
  if (to === undefined) {
    to = from;
  }
  const changes: string[] = [];
  const fromFields = from?.fields ?? {};
  const toFields = to?.fields ?? {};
  for (const field of Object.keys(fromFields)) {
    if (!(field in toFields)) {
      changes.push(`removed field ${field}`);
    } else if (fromFields[field] !== toFields[field]) {
      changes.push(`changed ${field} from ${fromFields[field]} to ${toFields[field]}`);
    }
  }
  for (const field of Object.keys(toFields)) {
    if (!(field in fromFields)) {
      changes.push(`added field ${field}`);
    }
  }
  for (const field of to?.required ?? []) {
    if (!from?.required?.includes(field) && !(field in fromFields)) {
      changes.push(`new required field ${field}`);
    }
  }
  const breaking = changes.some((change) => change.startsWith("removed") || change.startsWith("changed") || change.startsWith("new required"));
  return {
    event,
    from,
    to,
    breaking,
    changes,
    toText: () => [`Schema diff: ${event}`, "", ...(changes.length ? changes.map((change) => `- ${change}`) : ["- no changes"])].join("\n")
  };
}
