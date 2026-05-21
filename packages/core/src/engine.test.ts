import { describe, expect, it } from "vitest";
import { createStaleZero, entity, queryTarget, redisTarget } from "./index.js";

describe("StaleZero core", () => {
  it("executes declared mirrors and returns a receipt", async () => {
    const calls: string[] = [];
    const stale = createStaleZero({ app: "test" });

    stale.use({
      name: "redis",
      execute: (target) => {
        calls.push(`${target.action}:${target.key}`);
      }
    });

    stale.mutation("UserUpdated", {
      affects: (input: { userId: string }) => [entity("User", input.userId)]
    });

    stale.mirror("RedisUser", {
      when: "UserUpdated",
      target: (input: { userId: string }) => redisTarget(`user:${input.userId}`)
    });

    const receipt = await stale.changed("UserUpdated", { userId: "123" });

    expect(receipt.status).toBe("success");
    expect(receipt.affected).toEqual([{ type: "User", id: "123" }]);
    expect(calls).toEqual(["delete:user:123"]);
  });

  it("supports quick mutation builder", async () => {
    const keys: string[] = [];
    const stale = createStaleZero();
    stale.use({
      name: "query",
      execute: (target) => {
        keys.push(target.key);
      }
    });

    const receipt = await stale.mutate("UserUpdated", { userId: "123" }).query(["user", "123"]).run();

    expect(receipt.status).toBe("success");
    expect(keys).toEqual(['["user","123"]']);
  });

  it("previews without executing adapters", async () => {
    const stale = createStaleZero();
    stale.use({
      name: "query",
      execute: () => {
        throw new Error("should not execute");
      }
    });
    stale.mutation("ProductPriceChanged", {
      targets: () => [queryTarget(["product", "p_1"])]
    });

    const preview = await stale.preview("ProductPriceChanged", {});

    expect(preview.targets).toHaveLength(1);
    expect(preview.toText()).toContain("Would execute");
  });

  it("fails strict mode when an adapter fails", async () => {
    const stale = createStaleZero();
    stale.use({
      name: "redis",
      execute: () => {
        throw new Error("offline");
      }
    });

    await expect(stale.mutate("UserDeleted", {}).redis("user:123").run({ consistency: "strict" })).rejects.toThrow(
      "finished with status failed"
    );
  });

  it("retries adapters and records audit hooks", async () => {
    let attempts = 0;
    const audit: string[] = [];
    const stale = createStaleZero({
      execution: { retries: 1 },
      hooks: {
        onAdapterResult: ({ result }) => {
          audit.push(`${result.status}:${result.attempts}`);
        },
        onReceipt: ({ receipt }) => {
          audit.push(`receipt:${receipt.status}`);
        }
      }
    });

    stale.use({
      name: "redis",
      execute: () => {
        attempts += 1;
        if (attempts === 1) {
          throw new Error("try again");
        }
      }
    });

    const receipt = await stale.mutate("UserUpdated", {}).redis("user:123").run();

    expect(receipt.status).toBe("success");
    expect(attempts).toBe(2);
    expect(audit).toEqual(["success:2", "receipt:success"]);
  });

  it("enforces payload size limits", async () => {
    const stale = createStaleZero({ execution: { payloadLimitBytes: 8 } });

    await expect(stale.changed("TooLarge", { value: "this is too large" })).rejects.toThrow("above the configured limit");
  });

  it("redacts nested receipt payloads before storage", async () => {
    const stale = createStaleZero({
      receipts: {
        redactWith: (key, value) => (key === "public" ? value : value)
      }
    });

    const receipt = await stale.changed("SecretUpdated", {
      public: "ok",
      nested: { token: "hidden" }
    });

    expect(JSON.stringify(receipt.toJSON())).toContain("ok");
    expect(JSON.stringify(receipt.toJSON())).not.toContain("hidden");
  });
});
