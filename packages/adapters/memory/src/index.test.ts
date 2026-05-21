import { describe, expect, it } from "vitest";
import { createStaleZero } from "@stalezero/core";
import { memoryAdapter, memoryTarget } from "./index.js";

describe("memory adapter", () => {
  it("collects calls and can be cleared", async () => {
    const adapter = memoryAdapter();
    const stale = createStaleZero().use(adapter);

    const receipt = await stale.mutate("MemoryCheck", {}).target(memoryTarget("item:1")).run();

    expect(receipt.status).toBe("success");
    expect(adapter.calls).toHaveLength(1);

    adapter.clear();
    expect(adapter.calls).toHaveLength(0);
  });
});
