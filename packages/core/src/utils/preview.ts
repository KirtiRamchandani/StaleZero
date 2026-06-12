import type { PreviewConfidence, TargetRef } from "../types.js";

export function previewConfidenceForTargets(
  targets: TargetRef[]
): Array<{ target: TargetRef; confidence: PreviewConfidence; reasons: string[] }> {
  return targets.map((targetRef) => {
    const reasons: string[] = [];
    let confidence: PreviewConfidence = "exact";
    if (targetRef.key.includes("*") || Boolean(targetRef.meta?.pattern)) {
      confidence = "unsafe";
      reasons.push("wildcard target");
    } else if (["search", "http", "cdn", "job", "queue", "socket"].includes(targetRef.adapter)) {
      confidence = "estimated";
      reasons.push("external system confirms final effect");
    }
    if (targetRef.adapter === "manifest") {
      confidence = "unknown";
      reasons.push("loaded from manifest without runtime target details");
    }
    return { target: targetRef, confidence, reasons: reasons.length ? reasons : ["deterministic target"] };
  });
}

export function summarizePreviewConfidence(
  targetConfidence: Array<{ target: TargetRef; confidence: PreviewConfidence; reasons: string[] }>
): PreviewConfidence {
  if (targetConfidence.some((item) => item.confidence === "unsafe")) {
    return "unsafe";
  }
  if (targetConfidence.some((item) => item.confidence === "unknown")) {
    return "unknown";
  }
  if (targetConfidence.some((item) => item.confidence === "estimated")) {
    return "estimated";
  }
  return "exact";
}
