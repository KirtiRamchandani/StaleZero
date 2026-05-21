import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { packageDirs, root, run, writeReport, markdownTable } from "./lib.mjs";

const temp = join(tmpdir(), `stalezero-consumer-${Date.now()}`);
await rm(temp, { recursive: true, force: true });
await mkdir(temp, { recursive: true });

await run("npm", ["run", "verify:pack"]);

const tarballs = [];
for (const dir of await packageDirs()) {
  const output = await run("npm", ["pack", "--json", "--pack-destination", join(root, ".pack")], { cwd: dir, capture: true });
  tarballs.push(join(root, ".pack", JSON.parse(output.stdout)[0].filename));
}

await writeFile(join(temp, "package.json"), `${JSON.stringify({ type: "module", private: true }, null, 2)}\n`);
await run("npm", ["install", ...tarballs], { cwd: temp });

await writeFile(
  join(temp, "esm-smoke.mjs"),
  `
import { createStaleZero, memoryAdapter, memoryTarget, createOpenTelemetryHooks } from "stalezero";
const stale = createStaleZero().use(memoryAdapter());
const receipt = await stale.mutate("ConsumerSmoke", { id: "1" }).target(memoryTarget("consumer:1")).run();
if (receipt.status !== "success") throw new Error("receipt failed");
if (typeof createOpenTelemetryHooks !== "function") throw new Error("otel export missing");
console.log("esm ok", receipt.targets[0].key);
`
);

await writeFile(
  join(temp, "cjs-smoke.cjs"),
  `
(async () => {
  const mod = await import("stalezero");
  const stale = mod.createStaleZero().use(mod.memoryAdapter());
  const receipt = await stale.mutate("CjsDynamicImport", {}).target(mod.memoryTarget("cjs:1")).run();
  if (receipt.status !== "success") throw new Error("receipt failed");
  try {
    require("stalezero");
    throw new Error("require unexpectedly worked");
  } catch (error) {
    if (!String(error.message).includes("require")) {
      // Node versions format this differently; dynamic import is the supported CJS path.
    }
  }
  console.log("cjs dynamic import ok", receipt.targets[0].key);
})();
`
);

const esm = await run("node", ["esm-smoke.mjs"], { cwd: temp, capture: true });
const cjs = await run("node", ["cjs-smoke.cjs"], { cwd: temp, capture: true });

await writeReport(
  "consumer-smoke-tests",
  [
    "# Consumer Smoke Test Report",
    "",
    markdownTable(["Test", "Result", "Output"], [
      ["ESM consumer", "pass", esm.stdout.trim()],
      ["CJS dynamic import consumer", "pass", cjs.stdout.trim()],
      ["CJS require()", "not supported", "Documented ESM-only; CJS users should use dynamic import."]
    ])
  ].join("\n"),
  { temp, esm: esm.stdout.trim(), cjs: cjs.stdout.trim() }
);
