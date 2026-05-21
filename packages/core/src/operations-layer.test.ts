import { describe, expect, it } from "vitest";
import { createStaleZero, entity, queryTarget, redisTarget, target } from "./index.js";

describe("StaleZero operations layer", () => {
  it("runs flows with optional, parallel, retry, and changed steps", async () => {
    const calls: string[] = [];
    const stale = createStaleZero();
    stale.use({
      name: "query",
      execute: (targetRef) => {
        calls.push(targetRef.key);
      }
    });
    stale.mutation("OrderCancelled", {
      affects: (input: { orderId: string }) => [entity("Order", input.orderId)],
      targets: (input: { orderId: string }) => [queryTarget(["order", input.orderId])]
    });

    let attempts = 0;
    const flow = await stale
      .flow("CancelOrder", { orderId: "o1" })
      .step("refund-payment", () => {
        attempts += 1;
        if (attempts === 1) {
          throw new Error("retry");
        }
      }, { retry: 1 })
      .parallel("cleanup", [
        { name: "return-inventory", run: () => undefined },
        { name: "send-email", run: () => undefined, options: { optional: true } }
      ])
      .changed("OrderCancelled")
      .run();

    expect(flow.status).toBe("success");
    expect(flow.steps.map((step) => step.name)).toEqual(["refund-payment", "return-inventory", "send-email"]);
    expect(calls).toEqual(['["order","o1"]']);
  });

  it("previews undo, runs undo invalidations, and exports incident playbooks", async () => {
    const stale = createStaleZero();
    stale.use({ name: "redis", execute: () => undefined });
    stale.undoable("UserRoleChanged", {
      undo: () => undefined,
      windowMs: 60_000
    });
    const receipt = await stale.mutate("UserRoleChanged", { userId: "u1", role: "admin" }).redis("user:u1").run();

    const preview = await stale.previewUndo(receipt);
    const undo = await stale.undo(receipt);
    const incident = await stale.incident(receipt);
    const playbook = await stale.playbook(receipt);

    expect(preview.allowed).toBe(true);
    expect(undo.status).toBe("success");
    expect(incident).toContain("Incident: UserRoleChanged");
    expect(playbook.steps.length).toBeGreaterThan(0);
  });

  it("searches time machine receipts and detects drift with probes", async () => {
    const stale = createStaleZero();
    stale.use({ name: "redis", execute: () => undefined });
    stale.drift.use({
      adapter: "redis",
      check: () => ({ ok: false, message: "stale value still exists" })
    });
    stale.mutation("UserUpdated", {
      affects: (input: { userId: string }) => [entity("User", input.userId)],
      targets: (input: { userId: string }) => [redisTarget(`user:${input.userId}`)]
    });
    await stale.changed("UserUpdated", { userId: "123" });

    const matches = await stale.timeMachine().search({ entity: "User:123" });
    const report = await stale.drift.scan("User", "123");

    expect(matches).toHaveLength(1);
    expect(report.status).toBe("drift");
    expect(report.toText()).toContain("stale value");
  });

  it("scores impact, cost, canary readiness, state proofs, and diagnostics", async () => {
    const stale = createStaleZero();
    stale.use({
      name: "redis",
      execute: () => undefined,
      verify: () => true
    });
    stale.mutation("ProductPriceChanged", {
      owner: "catalog-team",
      schema: { parse: (input) => input as { productId: string } },
      affects: (input: { productId: string }) => [entity("Product", input.productId)],
      targets: (input: { productId: string }) => [redisTarget(`product:${input.productId}`)]
    });

    const impact = await stale.impact("ProductPriceChanged", { productId: "p1" });
    const cost = await stale.cost("ProductPriceChanged", { productId: "p1" });
    const canary = await stale.canary("ProductPriceChanged", { productId: "p1" });
    const receipt = await stale.changed("ProductPriceChanged", { productId: "p1" }, { prove: true });
    const diagnostics = stale.diagnostics();

    expect(impact.level).toBe("low");
    expect(cost.level).toBe("low");
    expect(canary.readinessScore).toBeGreaterThan(80);
    expect(receipt.proofs?.[0]?.status).toBe("passed");
    expect(diagnostics.some((item) => item.code === "missing-owner")).toBe(false);
  });

  it("checks service contracts, schemas, marketplace entries, and filtered target replay", async () => {
    const stale = createStaleZero();
    stale.emits("UserUpdated", { fields: { userId: "string", teamId: "string" }, required: ["userId"] }, { service: "users" });
    stale.consumes("UserUpdated", { fields: { userId: "string", teamId: "string" }, required: ["userId"] }, { service: "dashboard" });
    const registry = stale.schemaRegistry().register("UserUpdated", { version: "1", fields: { userId: "string" } });

    const receipt = await stale
      .mutate("UserUpdated", { userId: "u1" })
      .target(target("redis", "user:u1", "delete"))
      .target(target("search", "users:u1", "enqueue", { required: false }))
      .run({ dryRun: true });
    const replay = await stale.replay(receipt, { mode: "sandbox", target: "redis:delete:user:u1" });

    expect(stale.contractCheck().passed).toBe(true);
    expect(registry.diff("UserUpdated").breaking).toBe(false);
    expect(stale.marketplace().some((entry) => entry.name.includes("pack-commerce"))).toBe(true);
    expect(replay.receipt.targets).toHaveLength(1);
  });
});
