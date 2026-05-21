import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { packageDirs, readJson, root, writeReport, markdownTable } from "./lib.mjs";

const snapshotPath = join(root, "docs", "api-snapshot.json");
const rows = [];
const snapshot = {};

for (const dir of await packageDirs()) {
  const pkg = await readJson(join(dir, "package.json"));
  const dts = await readFile(join(dir, "dist", "index.d.ts"), "utf8");
  const exports = dts
    .split("\n")
    .filter((line) => line.startsWith("export "))
    .map((line) => line.trim())
    .sort();
  snapshot[pkg.name] = exports;
  rows.push([pkg.name, exports.length]);
}

let previous;
try {
  previous = JSON.parse(await readFile(snapshotPath, "utf8"));
} catch {
  previous = undefined;
}

if (!previous) {
  await writeFile(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`);
} else {
  const before = JSON.stringify(previous, null, 2);
  const after = JSON.stringify(snapshot, null, 2);
  if (before !== after) {
    await writeReport(
      "api-snapshot-diff",
      [
        "# API Snapshot Diff",
        "",
        "The generated public API differs from `docs/api-snapshot.json`. Review the change and update the snapshot intentionally.",
        "",
        "## Current Export Counts",
        "",
        markdownTable(["Package", "Exports"], rows)
      ].join("\n"),
      { previous, current: snapshot }
    );
    throw new Error("Public API snapshot changed");
  }
}

await writeReport(
  "api-snapshot-report",
  ["# API Snapshot Report", "", markdownTable(["Package", "Exports"], rows), "", "Result: pass"].join("\n"),
  snapshot
);
