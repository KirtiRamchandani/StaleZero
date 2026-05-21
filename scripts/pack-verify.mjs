import { mkdir, rm } from "node:fs/promises";
import { join, relative } from "node:path";
import { packageDirs, root, run, writeReport, markdownTable, passFail } from "./lib.mjs";

const packDir = join(root, ".pack");
await rm(packDir, { recursive: true, force: true });
await mkdir(packDir, { recursive: true });

await run("npm", ["run", "metadata:prepare"]);
await run("npm", ["run", "clean"]);
await run("npm", ["run", "build"]);

const results = [];
for (const dir of await packageDirs()) {
  const output = await run("npm", ["pack", "--json", "--pack-destination", packDir], { cwd: dir, capture: true });
  const packed = JSON.parse(output.stdout)[0];
  const files = packed.files.map((file) => file.path);
  const hasDist = files.some((file) => file.startsWith("dist/"));
  const hasDts = files.some((file) => file.endsWith(".d.ts"));
  const hasReadme = files.some((file) => file.toLowerCase() === "readme.md");
  const hasLicense = files.some((file) => file.toLowerCase() === "license");
  const testFiles = files.filter((file) => /\.test\./.test(file) || /\.spec\./.test(file));
  const absolutePaths = files.filter((file) => /[A-Za-z]:\\|\/Users\//.test(file));
  const sourceMaps = files.filter((file) => file.endsWith(".map"));

  results.push({
    package: packed.name,
    version: packed.version,
    filename: packed.filename,
    unpackedSize: packed.unpackedSize,
    fileCount: files.length,
    hasDist,
    hasDts,
    hasReadme,
    hasLicense,
    testFiles,
    sourceMaps,
    absolutePaths,
    files
  });
}

const rows = results.map((item) => [
  item.package,
  item.fileCount,
  passFail(item.hasDist),
  passFail(item.hasDts),
  passFail(item.hasReadme),
  passFail(item.hasLicense),
  item.testFiles.length,
  item.sourceMaps.length,
  item.absolutePaths.length,
  item.filename
]);

const failures = results.filter(
  (item) => !item.hasDist || !item.hasDts || !item.hasReadme || !item.hasLicense || item.testFiles.length > 0 || item.absolutePaths.length > 0
);

await writeReport(
  "npm-pack-verification",
  [
    "# npm Pack Verification Report",
    "",
    `Pack destination: \`${relative(root, packDir)}\``,
    "",
    markdownTable(
      ["Package", "Files", "dist", ".d.ts", "README", "LICENSE", "tests", "maps", "absolute paths", "Tarball"],
      rows
    ),
    "",
    "Source maps policy: JavaScript and declaration maps are shipped intentionally for debuggability. TypeScript source files are not shipped.",
    "",
    failures.length === 0 ? "Result: pass" : `Result: fail (${failures.map((item) => item.package).join(", ")})`
  ].join("\n"),
  results
);

if (failures.length > 0) {
  throw new Error("Pack verification failed");
}
