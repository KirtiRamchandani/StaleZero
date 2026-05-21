import type { StaleZero } from "@stalezero/core";

export function saasPack(stale: StaleZero): void {
  stale.resource("User", { id: "userId", cache: true, query: true, next: true, socket: true });
  stale.resource("Team", { id: "teamId", cache: true, query: true, next: true, socket: true });
  stale.resource("Role", { id: "roleId", cache: true, query: true, next: true });
  stale.resource("Tenant", { id: "tenantId", cache: { prefix: "tenant:" }, query: true, next: true });
  stale.resource("BillingPlan", { id: "planId", cache: { prefix: "billing:" }, query: true, next: true });
}

export default saasPack;
