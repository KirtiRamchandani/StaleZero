import { describe, expect, it } from "vitest";
import {
  createStaleZero,
  entity,
  FileReceiptStore,
  MemoryReceiptStore,
  redisTarget,
  StaleZeroUnknownMutationError,
  StaleZeroValidationError
} from "./index.js";

describe("production safety defaults", () => {
  it("rejects undeclared mutations in production preset", async () => {
    const stale = createStaleZero.production();
    await expect(stale.changed("UndeclaredMutation", { id: "1" })).rejects.toBeInstanceOf(StaleZeroUnknownMutationError);
  });

  it("warns on undeclared mutations in development preset", async () => {
    const stale = createStaleZero.dev();
    const warnings: string[] = [];
    const original = console.warn;
    console.warn = (message: string) => warnings.push(message);
    try {
      await stale.mutate("QuickOnly", { id: "1" }).redis("user:1").run();
    } finally {
      console.warn = original;
    }
    expect(warnings.some((message) => message.includes("QuickOnly"))).toBe(true);
  });

  it("throws when registering duplicate mutation names", () => {
    const stale = createStaleZero();
    stale.mutation("UserUpdated", { affects: () => [entity("User", "1")] });
    expect(() => stale.mutation("UserUpdated", { affects: () => [entity("User", "2")] })).toThrow(StaleZeroValidationError);
  });

  it("applies blockUnsafeTargets in production preset", async () => {
    const stale = createStaleZero.production().mutation("TenantDeleted", { affects: () => [entity("Tenant", "b")] });
    await expect(
      stale.mutate("TenantDeleted", { tenantId: "b" }).target(redisTarget("*", { action: "delete" })).run()
    ).rejects.toThrow(/wildcard deletes/i);
  });

  it("supports quick builder helpers for actor, prove, and idempotency", async () => {
    const stale = createStaleZero.test().mutation("UserUpdated", { affects: () => [entity("User", "1")] });
    const receipt = await stale
      .mutate("UserUpdated", { userId: "1" })
      .redis("user:1")
      .withActor({ id: "actor-1" })
      .withTrace("trace-1")
      .idempotencyKey("idem-1")
      .dryRun()
      .run();
    expect(receipt.status).toBe("dry-run");
    expect(receipt.traceId).toBe("trace-1");
    expect(receipt.id).toBe("idem-1");
  });

  it("version receipts with schema metadata", async () => {
    const stale = createStaleZero.test().mutation("UserUpdated", {});
    const receipt = await stale.changed("UserUpdated", {});
    expect(receipt.schemaVersion).toBe(1);
    expect(receipt.toMarkdown()).toContain("Receipt");
    expect(receipt.toSlack()).toContain("UserUpdated");
    expect(receipt.toMermaid()).toContain("flowchart TD");
  });
});

describe("durable receipt stores", () => {
  it("persists receipts through FileReceiptStore", async () => {
    const path = `.stalezero-test/receipts-${Date.now()}.jsonl`;
    const store = new FileReceiptStore({ path, maxEntries: 10 });
    const stale = createStaleZero.test({ receipts: { enabled: true } }).mutation("Saved", {});
    stale.useReceiptStore(store);
    const receipt = await stale.changed("Saved", { ok: true });
    const loaded = await store.get(receipt.id);
    expect(loaded?.mutation).toBe("Saved");
  });
});
