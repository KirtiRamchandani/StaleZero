import { describe, expect, it } from "vitest";
import { memoryAdapter, memoryTarget } from "@stalezero/memory";
import { adapterContractSuite, runAdapterContract } from "./index.js";

describe("testing helpers", () => {
  it("runs a reusable adapter contract", async () => {
    await runAdapterContract({ adapter: memoryAdapter(), validTarget: memoryTarget("contract:1") });
  });

  it("creates contract suite entries", () => {
    expect(adapterContractSuite({ adapter: memoryAdapter(), validTarget: memoryTarget("contract:1") })).toHaveLength(1);
  });
});
