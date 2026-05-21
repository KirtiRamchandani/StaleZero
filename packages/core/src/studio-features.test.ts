import { describe, expect, it } from "vitest";
import { createStaleZero, entity, httpTarget, queryTarget, redisTarget, target } from "./index.js";

describe("StaleZero studio and safety features", () => {
  it("creates snapshots, compares blast radius, and replays safely", async () => {
    const stale = createStaleZero();
    stale.mutation("UserUpdated", {
      affects: (input: { userId: string }) => [entity("User", input.userId)],
      targets: (input: { userId: string }) => [redisTarget(`user:${input.userId}`)]
    });

    const before = await stale.snapshot("UserUpdated", { userId: "123" });
    const after = await stale.mutate("UserUpdated", { userId: "123" }).redis("user:123").query(["user", "123"]).preview();
    const diff = await stale.compareSnapshots(before, {
      version: 1,
      mutation: "UserUpdated",
      input: after.input,
      affected: after.affected,
      targets: after.targets,
      risk: after.risk!,
      createdAt: new Date().toISOString()
    });

    const receipt = await stale.mutate("UserUpdated", { userId: "123" }).redis("user:123").run({ dryRun: true });
    const replay = await stale.replay(receipt, { mode: "sandbox" });

    expect(before.toText()).toContain("Snapshot");
    expect(diff.added).toContain('query:invalidate:["user","123"]');
    expect(replay.receipt.status).toBe("dry-run");
  });

  it("registers resource defaults and compiles indexes", async () => {
    const stale = createStaleZero();
    stale.resource("Product", {
      id: "productId",
      cache: true,
      query: true,
      next: true,
      socket: true
    });

    const preview = await stale.preview("ProductUpdated", { productId: "p1" });
    const compiled = stale.compileManifest();

    expect(preview.targets.map((item) => item.adapter).sort()).toEqual(["next", "query", "redis", "socket"]);
    expect(compiled.indexes.mutationToTargets.ProductUpdated.length).toBeGreaterThan(0);
  });

  it("runs batch adapters and records SLO status", async () => {
    const batches: number[] = [];
    const stale = createStaleZero().slo("ProductsChanged", {
      maxDurationMs: 1000,
      requiredTargets: ["redis"]
    });
    stale.use({
      name: "redis",
      execute: () => undefined,
      batchExecute: (targets) => {
        batches.push(targets.length);
      }
    });

    const receipt = await stale
      .mutate("ProductsChanged", {})
      .redis("product:1")
      .redis("product:2")
      .run();

    expect(batches).toEqual([2]);
    expect(receipt.slo?.status).toBe("passed");
    expect(receipt.results.every((result) => result.batch?.size === 2)).toBe(true);
  });

  it("coalesces repeated target execution", async () => {
    let calls = 0;
    const stale = createStaleZero().coalesce({ windowMs: 1000, by: "target" });
    stale.use({
      name: "redis",
      execute: () => {
        calls += 1;
      }
    });

    const first = await stale.mutate("ProductChanged", {}).redis("product:list").run();
    const second = await stale.mutate("ProductChanged", {}).redis("product:list").run();

    expect(first.results[0]?.status).toBe("success");
    expect(second.results[0]?.status).toBe("skipped");
    expect(second.results[0]?.coalesced?.count).toBe(1);
    expect(calls).toBe(1);
  });

  it("guards tenant boundaries, unsafe targets, approval, and rate limits", async () => {
    const stale = createStaleZero()
      .tenant({
        actorTenant: ({ actor }) => (actor as { tenantId?: string } | undefined)?.tenantId,
        inputTenant: ({ input }) => (input as { tenantId?: string }).tenantId,
        blockCrossTenant: true
      })
      .security({ requireActor: true, requireTenantBoundary: true, blockUnsafeTargets: true })
      .risk({ requireApproval: "medium" })
      .approval("TenantDeleted", { requiredWhen: ({ preview }) => preview.targets.length > 0 })
      .rateLimit("ProductPriceChanged", { max: 1, windowMs: 60_000, key: ({ input }) => String((input as { productId: string }).productId) });

    await expect(
      stale.mutate("TenantDeleted", { tenantId: "b" }).target(httpTarget("http://169.254.169.254/latest")).run({
        actor: { tenantId: "a" }
      })
    ).rejects.toThrow("cross-tenant");

    const approved = await stale.mutate("TenantDeleted", { tenantId: "a" }).target(redisTarget("user:1")).run({
      dryRun: true,
      actor: { tenantId: "a" },
      approvalToken: "admin"
    });

    await stale.mutate("ProductPriceChanged", { productId: "p1" }).run({ actor: { tenantId: "a" } });
    await expect(stale.mutate("ProductPriceChanged", { productId: "p1" }).run({ actor: { tenantId: "a" } })).rejects.toThrow(
      "Rate limit"
    );
    expect(approved.approval?.granted).toBe(true);
  });

  it("processes inbox events, records blackbox entries, and runs workflows", async () => {
    const stale = createStaleZero().blackbox({ enabled: true, retainLast: 5 });
    stale.mutation("OrderCancelled", {
      affects: (input: { orderId: string }) => [entity("Order", input.orderId)],
      targets: (input: { orderId: string }) => [queryTarget(["order", input.orderId])]
    });

    const inbox = stale.inbox();
    const event = {
      id: "evt_1",
      mutation: "OrderCancelled",
      input: { orderId: "o1" },
      affected: [entity("Order", "o1")],
      timestamp: Date.now(),
      hops: 0
    };
    const receipt = await inbox.process(event);
    const duplicate = await inbox.process(event);
    const workflow = await stale.workflow("CancelOrder", { orderId: "o1" }, async (step) => {
      await step("mark-cancelled", () => "ok");
      await step("notify", () => stale.changed("OrderCancelled", { orderId: "o1" }, { dryRun: true }));
    });

    expect(receipt?.mutation).toBe("OrderCancelled");
    expect(duplicate).toBeUndefined();
    expect(workflow.status).toBe("success");
    expect(stale.blackboxEntries().length).toBeGreaterThan(0);
  });

  it("runs mutation contracts", async () => {
    const stale = createStaleZero();
    stale.mutation("UserUpdated", {
      affects: () => [entity("User", "123")],
      targets: () => [target("redis", "user:123", "delete")]
    });

    const result = await stale.contract("UserUpdated", {
      input: {},
      affects: [["User", "123"]],
      invalidates: ["redis:user:123"],
      maxRisk: "low"
    });

    expect(result).toEqual({ mutation: "UserUpdated", passed: true, failures: [] });
  });
});
