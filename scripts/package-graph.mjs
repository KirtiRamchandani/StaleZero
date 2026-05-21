import { join, relative } from "node:path";
import { packageDirs, readJson, writeReport, markdownTable } from "./lib.mjs";

const packages = new Map();
for (const dir of await packageDirs()) {
  const pkg = await readJson(join(dir, "package.json"));
  packages.set(pkg.name, {
    dir,
    dependencies: Object.keys(pkg.dependencies ?? {}).filter((name) => name.startsWith("@stalezero/") || name === "stalezero")
  });
}

const cycles = [];
function visit(name, path = []) {
  if (path.includes(name)) {
    cycles.push([...path.slice(path.indexOf(name)), name]);
    return;
  }
  const item = packages.get(name);
  if (!item) return;
  for (const dep of item.dependencies) {
    visit(dep, [...path, name]);
  }
}

for (const name of packages.keys()) visit(name);

const rows = [...packages.entries()].map(([name, item]) => [name, relative(process.cwd(), item.dir), item.dependencies.join(", ") || "none"]);
await writeReport(
  "package-graph-report",
  [
    "# Package Graph Report",
    "",
    markdownTable(["Package", "Path", "Internal dependencies"], rows),
    "",
    cycles.length === 0 ? "Circular dependencies: none" : `Circular dependencies: ${cycles.map((cycle) => cycle.join(" -> ")).join("; ")}`
  ].join("\n"),
  { packages: rows, cycles }
);

if (cycles.length > 0) {
  throw new Error("Circular package dependencies found");
}
