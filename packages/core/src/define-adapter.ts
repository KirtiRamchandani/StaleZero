import type { Adapter, TargetRef } from "./types.js";

export type AdapterDefinition<Target extends TargetRef = TargetRef> = Adapter<Target> & {
  maturity?: "experimental" | "beta" | "stable" | "production";
  supportedActions?: string[];
  docsUrl?: string;
};

export function defineAdapter<Target extends TargetRef = TargetRef>(definition: AdapterDefinition<Target>): AdapterDefinition<Target> {
  return definition;
}

export type AdapterConformanceOptions = {
  adapter: Adapter;
  validTarget?: TargetRef;
  unsupportedTarget?: TargetRef;
};

/** Run adapter contract checks; use `createConformanceTests` from `@stalezero/testing` in Vitest suites. */
export function createAdapterConformancePlan(options: AdapterConformanceOptions): Array<{ name: string; description: string }> {
  const tests = [
    { name: `${options.adapter.name} accepts a valid target`, description: "Executes a supported target without failures" }
  ];
  if (options.unsupportedTarget) {
    tests.push({
      name: `${options.adapter.name} rejects an unsupported target`,
      description: "Fails closed on unsupported actions or keys"
    });
  }
  return tests;
}

export function adapterMaturityBadge(maturity: AdapterDefinition["maturity"] = "experimental"): string {
  const colors: Record<NonNullable<AdapterDefinition["maturity"]>, string> = {
    experimental: "#f59e0b",
    beta: "#3b82f6",
    stable: "#16a34a",
    production: "#111827"
  };
  const color = colors[maturity ?? "experimental"];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="90" height="20"><rect width="90" height="20" rx="3" fill="${color}"/><text x="45" y="14" fill="#fff" font-size="11" text-anchor="middle" font-family="system-ui">${maturity}</text></svg>`;
}
