import { join } from "node:path";
import { readJson, root, writeReport, markdownTable } from "./lib.mjs";

const lock = await readJson(join(root, "package-lock.json"));
const allowed = new Set(["MIT", "ISC", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause", "0BSD"]);
const rows = [];

for (const [path, info] of Object.entries(lock.packages ?? {})) {
  if (!path.startsWith("node_modules/")) continue;
  const name = path.replace(/^node_modules\//, "");
  const license = info.license ?? "unknown";
  const status = allowed.has(license) ? "pass" : "review";
  rows.push([name, license, status]);
}

const review = rows.filter((row) => row[2] !== "pass");
await writeReport(
  "license-report",
  [
    "# License Report",
    "",
    markdownTable(["Package", "License", "Status"], rows),
    "",
    review.length === 0 ? "Result: pass" : `Result: review required for ${review.map((row) => row[0]).join(", ")}`
  ].join("\n"),
  rows
);
