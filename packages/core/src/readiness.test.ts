import { describe, expect, it } from "vitest";
import { createStaleZero, customTarget, entity, redisTarget, target, type Manifest, type SchemaLike } from "./index.js";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("core readiness", () => {
  it("supports source registration, manifest generation, loading, manifest preview, and manifest why mode", async () => {
    const stale = createStaleZero({ app: "api", environment: "test" });

    stale.source("User");
    stale.mutation("UserUpdated", {
      source: "User",
      affects: ({ userId }: { userId: string }) => [entity("User", userId)]
    });
    stale.mirror("RedisUser", {
      when: "UserUpdated",
      description: "User cache entry",
      target: ({ userId }: { userId: string }) => redisTarget(`user:${userId}`)
    });

    const manifest = stale.generateManifest();

    expect(manifest.sources).toEqual(["User"]);
    expect(manifest.mutations.UserUpdated?.mirrors).toEqual(["RedisUser"]);

    const loaded = createStaleZero().loadManifest(manifest);
    const loadedManifest = loaded.generateManifest();
    const loadedPreview = await loaded.preview("UserUpdated", { userId: "123" });
    const why = await loaded.why("RedisUser", { userId: "123" });

    expect(loadedManifest.mutations.UserUpdated?.mirrors).toEqual(["RedisUser"]);
    expect(loadedPreview.targets[0]?.label).toBe("RedisUser");
    expect(why.mutations).toEqual(["UserUpdated"]);
  });

  it("runs targets by priority when concurrency is one", async () => {
    const order: string[] = [];
    const stale = createStaleZero({ execution: { concurrency: 1 } });
    stale.use({
      name: "memory",
      execute: (targetRef) => {
        order.push(targetRef.key);
      }
    });

    await stale.mutate("PriorityCheck", {}).custom("memory", "third", "custom", { priority: 30 }).custom("memory", "first", "custom", { priority: 10 }).custom("memory", "second", "custom", { priority: 20 }).run();

    expect(order).toEqual(["first", "second", "third"]);
  });

  it("limits concurrent adapter execution", async () => {
    let active = 0;
    let maxActive = 0;
    const stale = createStaleZero({ execution: { concurrency: 2 } });
    stale.use({
      name: "memory",
      execute: async () => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await delay(10);
        active -= 1;
      }
    });

    await stale.mutation("ManyTargets", {
      targets: () => [
        customTarget("memory", "1"),
        customTarget("memory", "2"),
        customTarget("memory", "3"),
        customTarget("memory", "4"),
        customTarget("memory", "5")
      ]
    }).changed("ManyTargets", {});

    expect(maxActive).toBeLessThanOrEqual(2);
  });

  it("dedupes same adapter/action/key in one mutation", async () => {
    let calls = 0;
    const stale = createStaleZero();
    stale.use({
      name: "redis",
      execute: () => {
        calls += 1;
      }
    });
    stale.mutation("UserUpdated", {
      targets: () => [redisTarget("user:123"), redisTarget("user:123")]
    });
    stale.mirror("RedisUserA", {
      when: "UserUpdated",
      target: () => redisTarget("user:123")
    });
    stale.mirror("RedisUserB", {
      when: "UserUpdated",
      target: () => redisTarget("user:123")
    });

    const receipt = await stale.changed("UserUpdated", {});

    expect(calls).toBe(1);
    expect(receipt.targets).toHaveLength(1);
  });

  it("runs dry-run without executing adapters", async () => {
    let calls = 0;
    const stale = createStaleZero();
    stale.use({
      name: "redis",
      execute: () => {
        calls += 1;
      }
    });

    const receipt = await stale.mutate("DryRun", {}).redis("user:123").run({ dryRun: true });

    expect(calls).toBe(0);
    expect(receipt.status).toBe("dry-run");
    expect(receipt.results[0]?.status).toBe("skipped");
  });

  it("keeps best-effort failures visible without throwing", async () => {
    const stale = createStaleZero();
    stale.use({
      name: "redis",
      execute: () => {
        throw new Error("offline");
      }
    });

    const receipt = await stale.mutate("BestEffort", {}).redis("user:123").run({ consistency: "best-effort" });

    expect(receipt.status).toBe("failed");
    expect(receipt.hasFailures()).toBe(true);
    expect(receipt.toJSON().results[0]?.error?.message).toBe("offline");
    expect(receipt.toText()).toContain("offline");
  });

  it("does not throw strict mode for optional target failures", async () => {
    const stale = createStaleZero();
    stale.use({
      name: "optional",
      execute: () => {
        throw new Error("optional offline");
      }
    });

    const receipt = await stale.mutate("OptionalFailure", {}).custom("optional", "cache:1", "custom", { required: false }).run({
      consistency: "strict"
    });

    expect(receipt.hasFailures()).toBe(true);
    expect(receipt.hasBlockingFailures()).toBe(false);
    expect(receipt.status).toBe("failed");
  });

  it("times out isolated adapters", async () => {
    const stale = createStaleZero({ execution: { timeoutMs: 5 } });
    stale.use({
      name: "slow",
      execute: async () => {
        await delay(50);
      }
    });

    const receipt = await stale.mutate("SlowTarget", {}).custom("slow", "target").run();

    expect(receipt.status).toBe("failed");
    expect(receipt.results[0]?.error?.message).toContain("timed out");
  });

  it("runs command mode and emits a changed receipt", async () => {
    const updates: string[] = [];
    const stale = createStaleZero();
    stale.use({
      name: "memory",
      execute: (targetRef) => {
        updates.push(targetRef.key);
      }
    });
    stale.command("UpdateUser", {
      changed: "UserUpdated",
      run: ({ input }: { input: { userId: string } }) => ({ saved: input.userId }),
      affects: ({ input }) => [entity("User", input.userId)]
    });
    stale.mirror("MemoryUser", {
      when: "UserUpdated",
      target: ({ userId }: { userId: string }) => customTarget("memory", `user:${userId}`)
    });

    const result = await stale.run("UpdateUser", { userId: "123" });

    expect(result.output).toEqual({ saved: "123" });
    expect(result.receipt.mutation).toBe("UserUpdated");
    expect(result.receipt.affected).toEqual([{ type: "User", id: "123" }]);
    expect(updates).toEqual(["user:123"]);
  });

  it("validates input with safeParse and standard schemas", async () => {
    const safeParseEngine = createStaleZero().mutation("SafeParsed", {
      schema: {
        safeParse: (input: unknown) =>
          typeof input === "object" && input !== null && "id" in input
            ? { success: true as const, data: input as { id: string } }
            : { success: false as const, error: new Error("id required") }
      },
      affects: ({ id }) => [entity("Safe", id)]
    });

    const standardSchema: SchemaLike<{ id: string }> = {
      "~standard": {
        validate: (input: unknown) =>
          typeof input === "object" && input !== null && "id" in input
            ? { value: input as { id: string } }
            : { issues: [new Error("id required")] }
      }
    };
    const standardEngine = createStaleZero().mutation("StandardParsed", {
      schema: standardSchema,
      affects: ({ id }) => [entity("Standard", id)]
    });

    await expect(safeParseEngine.changed("SafeParsed", {} as never)).rejects.toThrow("Invalid mutation input");
    await expect(standardEngine.changed("StandardParsed", {} as never)).rejects.toThrow("Invalid mutation input");
    await expect(safeParseEngine.changed("SafeParsed", { id: "1" })).resolves.toMatchObject({ affected: [{ type: "Safe", id: "1" }] });
    await expect(standardEngine.changed("StandardParsed", { id: "2" })).resolves.toMatchObject({
      affected: [{ type: "Standard", id: "2" }]
    });
  });

  it("publishes bus targets with receipt correlation", async () => {
    const events: string[] = [];
    const stale = createStaleZero({ app: "api", distributed: { enabled: true, ignoreSelf: true } });
    stale.useBus({
      name: "test-bus",
      publish: (event) => {
        events.push(`${event.id}:${event.mutation}`);
      },
      subscribe: () => () => undefined
    });

    const receipt = await stale.changed("UserUpdated", { userId: "123" });

    expect(events).toEqual([`${receipt.id}:UserUpdated`]);
    expect(receipt.targets.at(-1)?.adapter).toBe("bus");
  });

  it("uses idempotency keys for deterministic receipt IDs", async () => {
    const stale = createStaleZero();
    const receipt = await stale.changed("Idempotent", { id: "1" }, { idempotencyKey: "order-1-update" });

    expect(receipt.id).toBe("order-1-update");
  });

  it("supports health checks, readiness, shutdown, and receipt export", async () => {
    let stopped = false;
    const stale = createStaleZero();
    stale.use({
      name: "healthy",
      execute: () => undefined,
      health: () => "ok",
      shutdown: () => {
        stopped = true;
      }
    });

    await stale.mutate("HealthCheck", {}).custom("healthy", "target").run();

    expect(await stale.ready()).toBe(true);
    expect((await stale.health()).status).toBe("ok");
    expect(await stale.exportReceipts()).toHaveLength(1);

    await stale.shutdown();

    expect(stopped).toBe(true);
  });

  it("keeps only retained receipts when retention limits are configured", async () => {
    const stale = createStaleZero({ receipts: { maxEntries: 1 } });

    await stale.changed("First", {});
    await delay(1);
    await stale.changed("Second", {});

    const receipts = await stale.receipts.list();
    expect(receipts).toHaveLength(1);
    expect(receipts[0]?.mutation).toBe("Second");
  });

  it("opens adapter circuits after repeated failures", async () => {
    let calls = 0;
    const stale = createStaleZero({
      execution: { circuitBreaker: { enabled: true, failureThreshold: 1, cooldownMs: 1000 } }
    });
    stale.use({
      name: "fragile",
      execute: () => {
        calls += 1;
        throw new Error("offline");
      }
    });

    const first = await stale.mutate("Circuit", {}).custom("fragile", "a").run();
    const second = await stale.mutate("Circuit", {}).custom("fragile", "b").run();

    expect(first.results[0]?.error?.message).toBe("offline");
    expect(second.results[0]?.error?.message).toContain("Circuit breaker is open");
    expect(calls).toBe(1);
  });

  it("runs changedMany as a bounded batch", async () => {
    const keys: string[] = [];
    const stale = createStaleZero({ execution: { concurrency: 1 } });
    stale.use({
      name: "memory",
      execute: (targetRef) => {
        keys.push(targetRef.key);
      }
    });

    const receipts = await stale.changedMany([
      { mutation: "A", input: {}, options: { idempotencyKey: "a" } },
      { mutation: "B", input: {}, options: { idempotencyKey: "b" } }
    ]);

    expect(receipts.map((receipt) => receipt.id)).toEqual(["a", "b"]);
    expect(keys).toEqual([]);
  });
});

describe("manifest type shape", () => {
  it("accepts a loaded manifest with sources", () => {
    const manifest: Manifest = {
      app: "api",
      sources: ["User"],
      mutations: { UserUpdated: { source: "User", mirrors: ["RedisUser"] } },
      mirrors: { RedisUser: { when: ["UserUpdated"] } },
      adapters: ["redis"],
      generatedAt: new Date(0).toISOString()
    };

    expect(createStaleZero().loadManifest(manifest).generateManifest().sources).toEqual(["User"]);
  });
});
