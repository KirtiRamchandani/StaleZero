import { mkdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { root, run, writeReport, markdownTable, passFail } from "./lib.mjs";

await run("npm", ["run", "build"]);

const directory = join(tmpdir(), `stalezero-template-${Date.now()}`);
await rm(directory, { recursive: true, force: true });
await mkdir(directory, { recursive: true });

await run("node", [
  join(root, "packages/create-stalezero-adapter-template/dist/index.js"),
  directory,
  "--package=@acme/stalezero-widget",
  "--adapter=widgetAdapter",
  "--target=widget"
]);

const files = ["package.json", "tsconfig.json", "README.md", "src/index.ts", "src/index.test.ts", "examples/minimal.mjs"];
const rows = [];
for (const file of files) {
  let exists = false;
  try {
    await stat(join(directory, file));
    exists = true;
  } catch {
    exists = false;
  }
  rows.push([file, passFail(exists)]);
}

await writeReport(
  "adapter-template-smoke-report",
  ["# Adapter Template Smoke Report", "", markdownTable(["File", "Result"], rows)].join("\n"),
  rows
);

if (rows.some((row) => row[1] !== "pass")) {
  throw new Error("Adapter template smoke test failed");
}
