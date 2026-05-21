import { copyFile, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { packageDirs, readJson, root } from "./lib.mjs";

const shared = {
  repository: {
    type: "git",
    url: "https://github.com/KirtiRamchandani/StaleZero.git"
  },
  bugs: {
    url: "https://github.com/KirtiRamchandani/StaleZero/issues"
  },
  homepage: "https://github.com/KirtiRamchandani/StaleZero#readme",
  keywords: [
    "cache",
    "invalidation",
    "typescript",
    "javascript",
    "state",
    "redis",
    "react-query",
    "swr",
    "nextjs",
    "mutation",
    "devtools",
    "opentelemetry"
  ],
  engines: {
    node: ">=20"
  }
};

for (const dir of await packageDirs()) {
  const packagePath = join(dir, "package.json");
  const pkg = await readJson(packagePath);
  const next = {
    ...pkg,
    ...shared,
    keywords: Array.from(new Set([...(pkg.keywords ?? []), ...shared.keywords]))
  };
  await writeFile(packagePath, `${JSON.stringify(next, null, 2)}\n`);

  const readme = [
    `# ${pkg.name}`,
    "",
    pkg.description ?? "StaleZero package.",
    "",
    "See the root README for full documentation.",
    "",
    "License: MIT",
    ""
  ].join("\n");
  await writeFile(join(dir, "README.md"), readme);
  await copyFile(join(root, "LICENSE"), join(dir, "LICENSE"));
}
