import { readdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { packageDirs, root, run, writeReport, markdownTable } from "./lib.mjs";

await run("npm", ["run", "clean"]);
await run("npm", ["run", "build"]);

const rows = [];
const details = [];

for (const dir of await packageDirs()) {
  const pkg = JSON.parse(await readFile(join(dir, "package.json"), "utf8"));
  const dtsPath = join(dir, "dist", "index.d.ts");
  const dts = await readFile(dtsPath, "utf8");
  const exports = dts
    .split("\n")
    .filter((line) => line.startsWith("export "))
    .map((line) => line.trim());
  rows.push([pkg.name, exports.length, basename(dtsPath)]);
  details.push(`## ${pkg.name}\n\n\`\`\`ts\n${exports.join("\n")}\n\`\`\``);
}

const stability = markdownTable(
  ["Surface", "Stability"],
  [
    ["createStaleZero()", "Stable"],
    ["changed()", "Stable"],
    ["preview()", "Stable"],
    ["receipts", "Stable"],
    ["memory adapter", "Stable"],
    ["Redis adapter", "Beta"],
    ["React Query adapter", "Beta"],
    ["SWR adapter", "Beta"],
    ["Next adapter", "Beta/server-only"],
    ["RTK Query adapter", "Experimental"],
    ["tRPC adapter", "Experimental"],
    ["GraphQL adapter", "Experimental"],
    ["Kafka/NATS buses", "Experimental"],
    ["Devtools", "Beta"],
    ["CLI", "Beta"]
  ]
);

await writeReport(
  "api-report",
  [
    "# Public API Report",
    "",
    "Generated from built declaration files.",
    "",
    "## Stability Map",
    "",
    stability,
    "",
    "## Package Export Counts",
    "",
    markdownTable(["Package", "Export lines", "Declaration"], rows),
    "",
    ...details
  ].join("\n"),
  { rows, generatedAt: new Date().toISOString() }
);
