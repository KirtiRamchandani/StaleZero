import type { Adapter, ApprovalConfig, GraphLintFinding, Manifest, MutationDefinition } from "../types.js";
import type { MirrorRecord } from "../engine/internal.js";
import { asArray } from "./collections.js";
import { inferAdapterFromMirrorName } from "./targeting.js";

export function builtInLintFindings(
  manifest: Manifest,
  mutations: Map<string, MutationDefinition>,
  mirrors: Map<string, MirrorRecord>,
  adapters: Map<string, Adapter>,
  approvalGates: Map<string, ApprovalConfig>
): GraphLintFinding[] {
  const findings: GraphLintFinding[] = [];
  for (const [name, item] of Object.entries(manifest.mutations)) {
    const definition = mutations.get(name);
    if (!definition?.schema) {
      findings.push({ rule: "missing-schema", severity: "warn", subject: name, message: "mutation has no schema" });
    }
    if (!definition?.owner) {
      findings.push({ rule: "missing-owner", severity: "warn", subject: name, message: "mutation has no owner" });
    }
    if (item.mirrors.length === 0) {
      findings.push({ rule: "no-targets", severity: "info", subject: name, message: "mutation has no targets" });
    }
    if (item.mirrors.length > 50) {
      findings.push({ rule: "too-many-targets", severity: "warn", subject: name, message: `${item.mirrors.length} targets may need batching or coalescing` });
    }
    if (/delete|purge|tenant/i.test(name) && !approvalGates.has(name)) {
      findings.push({ rule: "missing-approval", severity: "error", subject: name, message: "destructive mutation has no approval gate" });
    }
  }
  for (const [name, mirror] of mirrors) {
    if (!mirror.definition.owner) {
      findings.push({ rule: "target-missing-owner", severity: "warn", subject: name, message: "target has no owner" });
    }
    if (asArray(mirror.definition.when).length === 0) {
      findings.push({ rule: "unreachable-target", severity: "error", subject: name, message: "target is never reached" });
    }
    if (/redis/i.test(name) && /(^\*$|:\*$|\*)/.test(name)) {
      findings.push({ rule: "unsafe-redis-pattern", severity: "error", subject: name, message: "Redis wildcard target requires an explicit sandbox" });
    }
    if (/http|webhook/i.test(name) && !/allow|safe|signed/i.test(name)) {
      findings.push({ rule: "http-allowlist", severity: "warn", subject: name, message: "HTTP target should document allowlist and signing" });
    }
  }
  const usedAdapters = new Set([...mirrors.keys()].map(inferAdapterFromMirrorName));
  for (const adapter of adapters.keys()) {
    if (!usedAdapters.has(adapter)) {
      findings.push({ rule: "unused-adapter", severity: "info", subject: adapter, message: "adapter is registered but not used by the graph" });
    }
  }
  return findings;
}
