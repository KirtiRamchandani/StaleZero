import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { root, run, writeReport, markdownTable } from "./lib.mjs";

const temp = join(tmpdir(), `stalezero-cli-${Date.now()}`);
await rm(temp, { recursive: true, force: true });
await mkdir(temp, { recursive: true });

await run("npm", ["run", "build"]);

const cli = join(root, "packages", "cli", "dist", "index.js");
const manifest = {
  app: "app",
  environment: "test",
  mutations: { UserUpdated: { mirrors: ["ReactQueryUser"] } },
  mirrors: { ReactQueryUser: { when: ["UserUpdated"], description: "User query" } },
  adapters: ["query"],
  generatedAt: new Date(0).toISOString()
};

const rows = [];
const commands = [["init"], ["manifest"]];
for (const args of commands) {
  const result = await run("node", [cli, ...args], { cwd: temp, capture: true });
  rows.push([`stalezero ${args.join(" ")}`, "pass", firstLine(result.stdout)]);
}

await writeFile(join(temp, ".stalezero", "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
await mkdir(join(temp, ".stalezero", "receipts"), { recursive: true });
await writeFile(
  join(temp, ".stalezero", "receipts", "sample.json"),
  `${JSON.stringify(
    {
      id: "sample",
      mutation: "UserUpdated",
      input: { userId: "123" },
      affected: [{ type: "User", id: "123" }],
      targets: [{ adapter: "query", key: "[\"user\",\"123\"]", action: "invalidate" }],
      results: [],
      status: "success",
      durationMs: 1,
      timestamp: Date.now()
    },
    null,
    2
  )}\n`
);
await writeFile(
  join(temp, ".stalezero", "contracts.json"),
  `${JSON.stringify({ UserUpdated: { input: { userId: "123" }, invalidates: ["manifest:ReactQueryUser"] } }, null, 2)}\n`
);
await writeFile(
  join(temp, ".stalezero", "service-contracts.json"),
  `${JSON.stringify(
    {
      emits: [{ service: "users", event: "UserUpdated", schema: { fields: { userId: "string" }, required: ["userId"] } }],
      consumes: [{ service: "dashboard", event: "UserUpdated", schema: { fields: { userId: "string" }, required: ["userId"] } }]
    },
    null,
    2
  )}\n`
);
await writeFile(
  join(temp, ".stalezero", "schemas.json"),
  `${JSON.stringify({ UserUpdated: { version: "1", fields: { userId: "string" }, required: ["userId"] } }, null, 2)}\n`
);
await mkdir(join(temp, "src"), { recursive: true });
await writeFile(
  join(temp, "src", "user.ts"),
  [
    "queryClient.invalidateQueries(['user', id]);",
    "redis.del(`user:${id}`);",
    "revalidateTag(`user:${id}`);"
  ].join("\n")
);

for (const args of [
  ["preview", "UserUpdated", "--userId=123", "--teamId=456"],
  ["snapshot", "UserUpdated", "--userId=123"],
  ["compile"],
  ["test-contracts"],
  ["validate"],
  ["graph"],
  ["docs"],
  ["list", "mutations"],
  ["list", "targets"],
  ["why", "ReactQueryUser"],
  ["receipt", "sample"],
  ["replay", "sample", "--sandbox"],
  ["replay", "sample", "--target=query:invalidate:[\"user\",\"123\"]"],
  ["prove", "sample"],
  ["lint"],
  ["explain-stale", "User:123"],
  ["undo", "sample"],
  ["playbook", "sample"],
  ["incident", "sample"],
  ["canary", "UserUpdated", "--userId=123"],
  ["drift", "User", "123"],
  ["contract-check"],
  ["schema", "check"],
  ["cost", "UserUpdated", "--userId=123"],
  ["heatmap"],
  ["optimize-cost"],
  ["score"],
  ["badge"],
  ["ownership-map"],
  ["runbooks"],
  ["browser-helper"],
  ["chaos", "--adapter=query", "--fail-rate=0"],
  ["watch", "--once"],
  ["scan", "src"],
  ["scan", "duplicates", "src"],
  ["diagnostics"],
  ["generate", "product-catalog"],
  ["devtools", "--once"],
  ["doctor"],
  ["doctor", "--supply-chain"]
]) {
  const allowFailure = args[0] === "doctor" && args.includes("--supply-chain");
  const result = await run("node", [cli, ...args], { cwd: temp, capture: true, allowFailure });
  rows.push([`stalezero ${args.join(" ")}`, result.code === 0 ? "pass" : "warn", firstLine(result.stdout)]);
}

await writeReport("cli-smoke-test-report", ["# CLI Smoke Test Report", "", markdownTable(["Command", "Result", "First line"], rows)].join("\n"), rows);

function firstLine(output) {
  return (output.trim().split("\n")[0] ?? "").replaceAll(temp, "<temp>");
}
