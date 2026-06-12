import type { FreshnessSloDashboardReport, Receipt } from "../types.js";

export function freshnessSloDashboardFromReceipts(receipts: Receipt[]): FreshnessSloDashboardReport {
  const freshness = { met: 0, violated: 0, notConfigured: 0, violations: [] as FreshnessSloDashboardReport["freshness"]["violations"] };
  const slo = { passed: 0, failed: 0, failures: [] as FreshnessSloDashboardReport["slo"]["failures"] };

  for (const receipt of receipts) {
    if (!receipt.freshness) {
      freshness.notConfigured += 1;
    } else if (receipt.freshness.status === "met") {
      freshness.met += 1;
    } else if (receipt.freshness.status === "violated") {
      freshness.violated += 1;
      for (const check of receipt.freshness.checks.filter((item) => item.status === "violated")) {
        freshness.violations.push({
          mutation: receipt.mutation,
          check: check.name,
          actualMs: check.actualMs,
          maxStaleMs: check.maxStaleMs,
          receiptId: receipt.id
        });
      }
    } else {
      freshness.notConfigured += 1;
    }

    if (!receipt.slo) {
      continue;
    }
    if (receipt.slo.status === "passed") {
      slo.passed += 1;
    } else {
      slo.failed += 1;
      for (const check of receipt.slo.checks.filter((item) => item.status === "failed")) {
        slo.failures.push({
          mutation: receipt.mutation,
          check: check.name,
          message: check.message,
          receiptId: receipt.id
        });
      }
    }
  }

  const report: FreshnessSloDashboardReport = {
    totalReceipts: receipts.length,
    freshness,
    slo,
    toText: () => formatFreshnessSloDashboard(report)
  };
  return report;
}

function formatFreshnessSloDashboard(report: FreshnessSloDashboardReport): string {
  const lines = [
    "StaleZero Freshness & SLO Dashboard",
    `Receipts analyzed: ${report.totalReceipts}`,
    "",
    "Freshness",
    `- met: ${report.freshness.met}`,
    `- violated: ${report.freshness.violated}`,
    `- not configured: ${report.freshness.notConfigured}`
  ];
  if (report.freshness.violations.length) {
    lines.push("", "Freshness violations:");
    for (const item of report.freshness.violations.slice(0, 20)) {
      lines.push(`- ${item.mutation} ${item.check}: ${item.actualMs}ms > ${item.maxStaleMs}ms (${item.receiptId})`);
    }
  }
  lines.push("", "SLO", `- passed: ${report.slo.passed}`, `- failed: ${report.slo.failed}`);
  if (report.slo.failures.length) {
    lines.push("", "SLO failures:");
    for (const item of report.slo.failures.slice(0, 20)) {
      lines.push(`- ${item.mutation} ${item.check}${item.message ? `: ${item.message}` : ""} (${item.receiptId})`);
    }
  }
  return lines.join("\n");
}
