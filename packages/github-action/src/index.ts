import type { Manifest, RiskLevel } from "@stalezero/core";

export type ManifestDiff = {
  addedMutations: string[];
  removedMutations: string[];
  changedMutations: Array<{
    mutation: string;
    addedTargets: string[];
    removedTargets: string[];
    risk: RiskLevel;
  }>;
};

export type SecurityFinding = {
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  mutation?: string;
  target?: string;
};

export function diffManifests(before: Manifest, after: Manifest): ManifestDiff {
  const beforeNames = new Set(Object.keys(before.mutations));
  const afterNames = new Set(Object.keys(after.mutations));
  const addedMutations = [...afterNames].filter((name) => !beforeNames.has(name)).sort();
  const removedMutations = [...beforeNames].filter((name) => !afterNames.has(name)).sort();
  const changedMutations = [...afterNames]
    .filter((name) => beforeNames.has(name))
    .map((mutation) => {
      const beforeTargets = new Set(before.mutations[mutation]?.mirrors ?? []);
      const afterTargets = new Set(after.mutations[mutation]?.mirrors ?? []);
      const addedTargets = [...afterTargets].filter((target) => !beforeTargets.has(target)).sort();
      const removedTargets = [...beforeTargets].filter((target) => !afterTargets.has(target)).sort();
      return {
        mutation,
        addedTargets,
        removedTargets,
        risk: riskFromDelta(addedTargets.length, removedTargets.length)
      };
    })
    .filter((item) => item.addedTargets.length > 0 || item.removedTargets.length > 0);

  return { addedMutations, removedMutations, changedMutations };
}

export function mutationDiffMarkdown(diff: ManifestDiff): string {
  const lines = ["# StaleZero Mutation Diff", ""];
  if (diff.addedMutations.length) {
    lines.push("Added mutations:", ...diff.addedMutations.map((mutation) => `- ${mutation}`), "");
  }
  if (diff.removedMutations.length) {
    lines.push("Removed mutations:", ...diff.removedMutations.map((mutation) => `- ${mutation}`), "");
  }
  for (const item of diff.changedMutations) {
    lines.push(`## ${item.mutation}`, "", "Removed:", ...(item.removedTargets.length ? item.removedTargets.map((target) => `- ${target}`) : ["- none"]), "");
    lines.push("Added:", ...(item.addedTargets.length ? item.addedTargets.map((target) => `- ${target}`) : ["- none"]), "", `Risk: ${item.risk}`, "");
  }
  if (lines.length === 2) {
    lines.push("No mutation blast-radius changes detected.");
  }
  return `${lines.join("\n")}\n`;
}

export function inspectManifestSecurity(manifest: Manifest): SecurityFinding[] {
  const findings: SecurityFinding[] = [];
  for (const [mutation, item] of Object.entries(manifest.mutations)) {
    if (item.mirrors.length === 0) {
      findings.push({ severity: "medium", mutation, message: "Mutation has no declared targets" });
    }
    for (const target of item.mirrors) {
      const lowered = target.toLowerCase();
      if (target === "*" || lowered.includes("wildcard")) {
        findings.push({ severity: "high", mutation, target, message: "Target looks like a wildcard invalidation" });
      }
      if (lowered.includes("http") && !lowered.includes("allow")) {
        findings.push({ severity: "medium", mutation, target, message: "HTTP target should declare an allowlist" });
      }
      if (lowered.includes("devtools") && manifest.environment === "production") {
        findings.push({ severity: "critical", mutation, target, message: "Devtools target appears in a production manifest" });
      }
    }
  }
  return findings;
}

export function securityInspectorMarkdown(findings: SecurityFinding[]): string {
  if (findings.length === 0) {
    return "# StaleZero Security Review\n\nNo warnings found.\n";
  }
  return [
    "# StaleZero Security Review",
    "",
    "Warnings:",
    ...findings.map((finding) => `- ${finding.severity}: ${finding.message}${finding.mutation ? ` (${finding.mutation})` : ""}`)
  ].join("\n");
}

function riskFromDelta(added: number, removed: number): RiskLevel {
  const total = added + removed;
  if (removed > 10 || total > 20) {
    return "critical";
  }
  if (total > 5) {
    return "high";
  }
  if (total > 0) {
    return "medium";
  }
  return "low";
}
