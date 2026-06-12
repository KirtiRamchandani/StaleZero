import type { Receipt, StaleZeroHooks } from "@stalezero/core";

export type StaleZeroMetrics = {
  mutationTotal: (labels: { mutation: string; status: string }) => void;
  targetTotal: (labels: { adapter: string; status: string }) => void;
  mutationDurationMs: (labels: { mutation: string }, value: number) => void;
  proofTotal: (labels: { status: string }) => void;
  driftScanTotal: (labels: { status: string }) => void;
};

export type MetricsRecorder = Partial<StaleZeroMetrics>;

export function createInMemoryMetrics(): StaleZeroMetrics & { snapshot: () => Record<string, number> } {
  const counters = new Map<string, number>();
  const record = (name: string, labels: Record<string, string>, value = 1) => {
    const key = `${name}{${Object.entries(labels).map(([k, v]) => `${k}="${v}"`).join(",")}}`;
    counters.set(key, (counters.get(key) ?? 0) + value);
  };
  return {
    mutationTotal: (labels) => record("stalezero_mutations_total", labels),
    targetTotal: (labels) => record("stalezero_targets_total", labels),
    mutationDurationMs: (labels, value) => record("stalezero_mutation_duration_ms_sum", { ...labels, unit: "ms" }, value),
    proofTotal: (labels) => record("stalezero_proofs_total", labels),
    driftScanTotal: (labels) => record("stalezero_drift_scans_total", labels),
    snapshot: () => Object.fromEntries(counters)
  };
}

export function createStaleZeroMetricsHooks(metrics: MetricsRecorder): StaleZeroHooks {
  return {
    onReceipt: ({ receipt }) => {
      metrics.mutationTotal?.({ mutation: receipt.mutation, status: receipt.status });
      metrics.mutationDurationMs?.({ mutation: receipt.mutation }, receipt.durationMs);
      if (receipt.proofStatus) {
        metrics.proofTotal?.({ status: receipt.proofStatus });
      }
      for (const result of receipt.results) {
        metrics.targetTotal?.({ adapter: result.adapter, status: result.status });
      }
    }
  };
}

export function renderPrometheusMetrics(metrics: ReturnType<typeof createInMemoryMetrics>): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(metrics.snapshot())) {
    const match = /^([^{]+)\{(.+)\}$/.exec(key);
    if (!match) {
      continue;
    }
    const [, name, labelString] = match;
    lines.push(`${name}{${labelString}} ${value}`);
  }
  return `${lines.join("\n")}\n`;
}
