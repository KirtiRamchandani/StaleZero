import { cp, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { root, run, writeReport, markdownTable } from "./lib.mjs";

const temp = join(tmpdir(), `stalezero-clean-${Date.now()}`);
await rm(temp, { recursive: true, force: true });
await mkdir(temp, { recursive: true });

await cp(root, temp, {
  recursive: true,
  filter: (source) => {
    const normalized = source.replaceAll("\\", "/");
    return ![
      "/.git",
      "/node_modules",
      "/dist",
      "/.pack",
      "/reports"
    ].some((part) => normalized.includes(part));
  }
});

const commands = [
  ["npm", ["install"]],
  ["npm", ["run", "typecheck"]],
  ["npm", ["test"]],
  ["npm", ["run", "build"]],
  ["npm", ["run", "check"]]
];

const rows = [];
for (const [command, args] of commands) {
  const result = await run(command, args, { cwd: temp, capture: true });
  rows.push([[command, ...args].join(" "), "pass", `${result.durationMs}ms`]);
}

await writeReport(
  "clean-clone-verification",
  [
    "# Clean Clone Verification Report",
    "",
    "This local run uses a clean filesystem copy because the current workspace has no remote repository configured yet.",
    "",
    markdownTable(["Command", "Result", "Duration"], rows)
  ].join("\n"),
  { temp, rows, generatedAt: new Date().toISOString() }
);
