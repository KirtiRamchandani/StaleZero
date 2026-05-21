#!/usr/bin/env node
import { createServer } from "node:http";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { createStaleZero, type Manifest, type MutationSnapshotData, type Receipt } from "@stalezero/core";

type Command = {
  name: string;
  aliases?: string[];
  description: string;
  run: (args: string[]) => Promise<void>;
};

const commands: Command[] = [
  {
    name: "init",
    description: "Create a starter stalezero.config.json file",
    run: async () => {
      const file = resolve("stalezero.config.json");
      await writeFile(
        file,
        `${JSON.stringify({ app: "app", environment: "development", manifest: ".stalezero/manifest.json" }, null, 2)}\n`
      );
      console.log(`Created ${file}`);
    }
  },
  {
    name: "validate",
    description: "Validate a generated manifest",
    run: async (args) => {
      const manifest = await readManifest(args[0]);
      const missing = Object.entries(manifest.mutations).filter(([, value]) => value.mirrors.length === 0);
      const duplicateMirrors = duplicates(Object.keys(manifest.mirrors));
      const unsafePatterns = Object.keys(manifest.mirrors).filter((name) => name === "*" || name.length < 3);
      if (missing.length > 0) {
        for (const [name] of missing) {
          console.warn(`Mutation ${name} has no mirrors`);
        }
      }
      if (duplicateMirrors.length > 0) {
        for (const name of duplicateMirrors) {
          console.warn(`Duplicate target ${name}`);
        }
      }
      if (unsafePatterns.length > 0) {
        for (const name of unsafePatterns) {
          console.warn(`Unsafe target pattern ${name}`);
        }
      }
      if (missing.length > 0 || duplicateMirrors.length > 0 || unsafePatterns.length > 0) {
        process.exitCode = 1;
        return;
      }
      console.log("Manifest is valid");
    }
  },
  {
    name: "doctor",
    description: "Print local runtime information",
    run: async (args) => {
      console.log(`Node ${process.version}`);
      console.log(`Platform ${process.platform}`);
      console.log("Core package available");
      if (args.includes("--supply-chain")) {
        const checks = await supplyChainChecks();
        for (const check of checks) {
          console.log(`${check.ok ? "ok" : "warn"} ${check.name}${check.detail ? ` - ${check.detail}` : ""}`);
        }
        if (checks.some((check) => !check.ok)) {
          process.exitCode = 1;
        }
      }
    }
  },
  {
    name: "preview",
    description: "Preview an ad-hoc mutation from JSON input",
    run: async (args) => {
      const mutation = args[0];
      if (!mutation) {
        throw new Error("Usage: stalezero preview <mutation> [json|--key=value]");
      }
      const input = parseInputArgs(args.slice(1));
      const stale = createStaleZero();
      const preview = await stale.preview(mutation, input);
      console.log(preview.toText());
    }
  },
  {
    name: "snapshot",
    description: "Write a mutation blast-radius snapshot",
    run: async (args) => {
      const mutation = args[0];
      if (!mutation) {
        throw new Error("Usage: stalezero snapshot <mutation> [json|--key=value]");
      }
      const input = parseInputArgs(args.slice(1));
      const stale = createStaleZero();
      const manifest = await tryReadManifest();
      if (manifest) {
        stale.loadManifest(manifest);
      }
      const snapshot = await stale.snapshot(mutation, input);
      const output = resolve("__stalezero_snapshots__", `${mutation}.snap.json`);
      await mkdir(dirname(output), { recursive: true });
      await writeFile(output, `${JSON.stringify(snapshot.toJSON(), null, 2)}\n`);
      console.log(snapshot.toText());
      console.log(`Wrote ${output}`);
    }
  },
  {
    name: "replay",
    description: "Replay a receipt in sandbox, dry-run, safe-replay, or force mode",
    run: async (args) => {
      const idOrFile = args[0];
      if (!idOrFile) {
        throw new Error("Usage: stalezero replay <receipt-file> [--sandbox|--dry-run|--safe-replay|--force]");
      }
      const mode = args.includes("--force")
        ? "force"
        : args.includes("--safe-replay")
          ? "safe-replay"
          : args.includes("--dry-run")
            ? "dry-run"
            : "sandbox";
      const receipt = JSON.parse(await readReceipt(idOrFile)) as Receipt;
      const result = await createStaleZero().replay(receipt, { mode });
      console.log(result.toText());
    }
  },
  {
    name: "compile",
    description: "Compile a manifest into indexed graph files",
    run: async (args) => {
      const manifest = await readManifest(args[0]);
      const stale = createStaleZero().loadManifest(manifest);
      const compiled = stale.compileManifest();
      const manifestOutput = resolve(".stalezero/manifest.json");
      const graphOutput = resolve(".stalezero/compiled-graph.json");
      await mkdir(dirname(graphOutput), { recursive: true });
      await writeFile(manifestOutput, `${JSON.stringify(manifest, null, 2)}\n`);
      await writeFile(graphOutput, `${JSON.stringify(compiled, null, 2)}\n`);
      console.log(`Wrote ${manifestOutput}`);
      console.log(`Wrote ${graphOutput}`);
    }
  },
  {
    name: "test-contracts",
    description: "Run mutation contract checks from .stalezero/contracts.json",
    run: async () => {
      const file = resolve(".stalezero/contracts.json");
      if (!(await exists(file))) {
        console.log("No contracts found");
        return;
      }
      const contracts = JSON.parse(await readFile(file, "utf8")) as Record<string, unknown>;
      const stale = createStaleZero();
      const manifest = await tryReadManifest();
      if (manifest) {
        stale.loadManifest(manifest);
      }
      let failed = false;
      for (const [mutation, definition] of Object.entries(contracts)) {
        const result = await stale.contract(mutation, definition as Parameters<typeof stale.contract>[1]);
        console.log(`${result.passed ? "ok" : "fail"} ${mutation}`);
        for (const failure of result.failures) {
          console.log(`  ${failure}`);
        }
        failed ||= !result.passed;
      }
      if (failed) {
        process.exitCode = 1;
      }
    }
  },
  {
    name: "generate",
    description: "Generate recipe starter code",
    run: async (args) => {
      const recipe = args[0] ?? "product-catalog";
      const folder = resolve("src", "stalezero");
      await mkdir(folder, { recursive: true });
      const baseName = recipe.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "recipe";
      const source = join(folder, `${baseName}.ts`);
      const test = join(folder, `${baseName}.test.ts`);
      const doc = resolve("docs", `${baseName}-mutations.md`);
      await mkdir(dirname(doc), { recursive: true });
      await writeFile(source, recipeSource(recipe));
      await writeFile(test, recipeTestSource(recipe));
      await writeFile(doc, recipeDoc(recipe));
      console.log(`Wrote ${source}`);
      console.log(`Wrote ${test}`);
      console.log(`Wrote ${doc}`);
    }
  },
  {
    name: "docs",
    description: "Generate mutation documentation from a manifest",
    run: async (args) => {
      const manifest = await readManifest(args[0]);
      const markdown = renderMutationDocs(manifest);
      const html = renderGraphHtml(manifest);
      const markdownOutput = resolve("docs/mutations.md");
      const graphOutput = resolve("docs/mutation-graph.html");
      await mkdir(dirname(markdownOutput), { recursive: true });
      await writeFile(markdownOutput, markdown);
      await writeFile(graphOutput, html);
      console.log(`Wrote ${markdownOutput}`);
      console.log(`Wrote ${graphOutput}`);
    }
  },
  {
    name: "graph",
    description: "Write graph JSON, SVG, and HTML files from a manifest",
    run: async (args) => {
      const manifest = await readManifest(args[0]);
      const jsonOutput = resolve(".stalezero/graph.json");
      const svgOutput = resolve(".stalezero/graph.svg");
      const htmlOutput = resolve(".stalezero/graph.html");
      await mkdir(dirname(jsonOutput), { recursive: true });
      await writeFile(jsonOutput, `${JSON.stringify(manifest, null, 2)}\n`);
      await writeFile(svgOutput, renderGraphSvg(manifest));
      await writeFile(htmlOutput, renderGraphHtml(manifest));
      console.log(`Wrote ${jsonOutput}`);
      console.log(`Wrote ${svgOutput}`);
      console.log(`Wrote ${htmlOutput}`);
    }
  },
  {
    name: "manifest",
    aliases: ["generate-manifest"],
    description: "Create an empty manifest template",
    run: async () => {
      const stale = createStaleZero({ app: "app", environment: "development" });
      const output = resolve(".stalezero/manifest.json");
      await mkdir(dirname(output), { recursive: true });
      await writeFile(output, `${JSON.stringify(stale.generateManifest(), null, 2)}\n`);
      console.log(`Wrote ${output}`);
    }
  },
  {
    name: "receipt",
    aliases: ["inspect-receipt"],
    description: "Print a receipt JSON file",
    run: async (args) => {
      const idOrFile = args[0];
      if (!idOrFile) {
        throw new Error("Usage: stalezero receipt <id|file>");
      }
      console.log(await readReceipt(idOrFile));
    }
  },
  {
    name: "list-mutations",
    description: "List manifest mutations",
    run: async (args) => {
      const manifest = await readManifest(args[0]);
      console.log(Object.keys(manifest.mutations).join("\n"));
    }
  },
  {
    name: "list-targets",
    description: "List manifest mirrors",
    run: async (args) => {
      const manifest = await readManifest(args[0]);
      console.log(Object.keys(manifest.mirrors).join("\n"));
    }
  },
  {
    name: "why",
    description: "Explain a target from a manifest",
    run: async (args) => {
      const target = args[0];
      if (!target) {
        throw new Error("Usage: stalezero why <target> [manifest]");
      }
      const manifest = await readManifest(args[1]);
      const mirror = manifest.mirrors[target];
      if (!mirror) {
        throw new Error(`No target named ${target}`);
      }
      console.log(`${target} becomes stale when:\n${mirror.when.map((name) => `- ${name}`).join("\n")}`);
    }
  },
  {
    name: "devtools",
    description: "Launch a local static devtools viewer for the manifest",
    run: async (args) => {
      const once = args.includes("--once");
      const manifestPath = args.find((arg) => arg !== "--once");
      const manifest = await readManifest(manifestPath);
      if (once) {
        const output = resolve(".stalezero/devtools.html");
        await mkdir(dirname(output), { recursive: true });
        await writeFile(output, renderGraphHtml(manifest));
        console.log(`Wrote ${output}`);
        return;
      }
      const portArg = args.find((arg) => /^\d+$/.test(arg));
      const port = Number(portArg ?? process.env.PORT ?? 4587);
      const server = createServer((request, response) => {
        const url = request.url ?? "/";
        if (url.endsWith("/graph.json")) {
          response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
          response.end(JSON.stringify(manifest, null, 2));
          return;
        }
        if (url.endsWith("/graph.svg")) {
          response.writeHead(200, { "content-type": "image/svg+xml" });
          response.end(renderGraphSvg(manifest));
          return;
        }
        response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        response.end(renderGraphHtml(manifest));
      });
      await new Promise<void>((resolveListen) => server.listen(port, resolveListen));
      console.log(`Devtools listening on http://localhost:${port}`);
    }
  }
];

async function main(): Promise<void> {
  const [, , name, ...args] = process.argv;
  if (!name || name === "help" || name === "--help" || name === "-h") {
    printHelp();
    return;
  }
  const resolved = normalizeCommand(name, args);
  const command = commands.find((item) => item.name === resolved.name || item.aliases?.includes(resolved.name));
  if (!command) {
    throw new Error(`Unknown command: ${name}`);
  }
  await command.run(resolved.args);
}

function printHelp(): void {
  console.log("StaleZero");
  console.log("");
  console.log("Commands:");
  for (const command of commands) {
    console.log(`  ${command.name.padEnd(18)} ${command.description}`);
  }
}

async function readManifest(path = ".stalezero/manifest.json"): Promise<Manifest> {
  return JSON.parse(await readFile(resolve(path), "utf8")) as Manifest;
}

async function tryReadManifest(path = ".stalezero/manifest.json"): Promise<Manifest | undefined> {
  const resolved = resolve(path);
  if (!(await exists(resolved))) {
    return undefined;
  }
  return JSON.parse(await readFile(resolved, "utf8")) as Manifest;
}

async function readReceipt(idOrFile: string): Promise<string> {
  const direct = resolve(idOrFile);
  if (await exists(direct)) {
    return readFile(direct, "utf8");
  }

  const byId = resolve(".stalezero", "receipts", idOrFile.endsWith(".json") ? idOrFile : `${idOrFile}.json`);
  if (await exists(byId)) {
    return readFile(byId, "utf8");
  }

  throw new Error(`No receipt found for ${idOrFile}`);
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

function parseInputArgs(args: string[]): Record<string, unknown> {
  if (args.length === 0) {
    return {};
  }
  if (args.length === 1 && args[0]?.trim().startsWith("{")) {
    return JSON.parse(args[0]) as Record<string, unknown>;
  }
  const input: Record<string, unknown> = {};
  for (const arg of args) {
    const clean = arg.startsWith("--") ? arg.slice(2) : arg;
    const [key, ...valueParts] = clean.split("=");
    if (!key) {
      continue;
    }
    input[key] = parseScalar(valueParts.join("="));
  }
  return input;
}

function parseScalar(value: string): unknown {
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  if (value !== "" && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

async function supplyChainChecks(): Promise<Array<{ name: string; ok: boolean; detail?: string }>> {
  const checks: Array<{ name: string; ok: boolean; detail?: string }> = [];
  checks.push({ name: "lockfile present", ok: (await exists(resolve("package-lock.json"))) || (await exists(resolve("pnpm-lock.yaml"))) || (await exists(resolve("yarn.lock"))) });
  checks.push({ name: "security policy", ok: await exists(resolve("SECURITY.md")) });
  checks.push({ name: "release workflow", ok: await exists(resolve(".github/workflows/release.yml")) });
  checks.push({ name: "dependency review workflow", ok: await exists(resolve(".github/workflows/dependency-review.yml")) });
  const workflowsDir = resolve(".github/workflows");
  if (await exists(workflowsDir)) {
    const workflowFiles = (await readdir(workflowsDir)).filter((file) => file.endsWith(".yml") || file.endsWith(".yaml"));
    const unpinned: string[] = [];
    for (const file of workflowFiles) {
      const body = await readFile(join(workflowsDir, file), "utf8");
      if (/uses:\s*[^@\s]+\/[^@\s]+@v\d+/i.test(body)) {
        unpinned.push(file);
      }
    }
    checks.push({ name: "workflow actions pinned", ok: unpinned.length === 0, detail: unpinned.length ? unpinned.join(", ") : undefined });
  }
  const packageJson = await readPackageJson();
  checks.push({
    name: "publish metadata",
    ok: Boolean(packageJson.license && packageJson.repository),
    detail: packageJson.name ? String(packageJson.name) : undefined
  });
  return checks;
}

async function readPackageJson(): Promise<Record<string, unknown>> {
  const file = resolve("package.json");
  if (!(await exists(file))) {
    return {};
  }
  return JSON.parse(await readFile(file, "utf8")) as Record<string, unknown>;
}

function recipeSource(recipe: string): string {
  const mutation = recipe.includes("product") ? "ProductUpdated" : "ResourceUpdated";
  const entityName = recipe.includes("product") ? "Product" : "Resource";
  const idField = recipe.includes("product") ? "productId" : "id";
  return `import { createStaleZero, entity, nextTagTarget, queryTarget, redisTarget } from "stalezero";

export const stale = createStaleZero({ app: "app" });

stale.mutation("${mutation}", {
  affects: (input: { ${idField}: string }) => [entity("${entityName}", input.${idField})]
});

stale.mirror("${entityName}Redis", {
  when: "${mutation}",
  target: (input: { ${idField}: string }) => redisTarget("${entityName.toLowerCase()}:" + input.${idField})
});

stale.mirror("${entityName}Query", {
  when: "${mutation}",
  target: (input: { ${idField}: string }) => queryTarget(["${entityName.toLowerCase()}", input.${idField}])
});

stale.mirror("${entityName}Next", {
  when: "${mutation}",
  target: (input: { ${idField}: string }) => nextTagTarget("${entityName.toLowerCase()}:" + input.${idField})
});
`;
}

function recipeTestSource(recipe: string): string {
  const mutation = recipe.includes("product") ? "ProductUpdated" : "ResourceUpdated";
  const idField = recipe.includes("product") ? "productId" : "id";
  return `import { describe, expect, it } from "vitest";
import { stale } from "./${recipe.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "recipe"}.js";

describe("${mutation}", () => {
  it("keeps the blast radius stable", async () => {
    const snapshot = await stale.snapshot("${mutation}", { ${idField}: "123" });
    expect(snapshot.targets.length).toBeGreaterThan(0);
  });
});
`;
}

function recipeDoc(recipe: string): string {
  return `# ${recipe}

This recipe declares a mutation, affected entity, and cache targets that can be previewed before execution.

\`\`\`bash
stalezero snapshot ${recipe.includes("product") ? "ProductUpdated --productId=123" : "ResourceUpdated --id=123"}
\`\`\`
`;
}

function renderMutationDocs(manifest: Manifest): string {
  const lines = ["# Mutation graph", ""];
  for (const [mutation, item] of Object.entries(manifest.mutations)) {
    lines.push(`## ${mutation}`, "", "Invalidates:");
    if (item.mirrors.length === 0) {
      lines.push("- no targets declared");
    } else {
      for (const mirror of item.mirrors) {
        lines.push(`- ${mirror}`);
      }
    }
    lines.push("", "Security:", "- review schema, actor, tenant, and target safety before production use", "");
  }
  return `${lines.join("\n")}\n`;
}

function normalizeCommand(name: string, args: string[]): { name: string; args: string[] } {
  if (name === "list" && args[0] === "mutations") {
    return { name: "list-mutations", args: args.slice(1) };
  }
  if (name === "list" && args[0] === "targets") {
    return { name: "list-targets", args: args.slice(1) };
  }
  return { name, args };
}

function duplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      repeated.add(value);
    }
    seen.add(value);
  }
  return [...repeated];
}

function renderGraphSvg(manifest: Manifest): string {
  const mutations = Object.keys(manifest.mutations);
  const width = 900;
  const height = Math.max(220, mutations.length * 90 + 80);
  const rows = mutations
    .map((mutation, index) => {
      const y = 60 + index * 90;
      const mirrors = manifest.mutations[mutation]?.mirrors ?? [];
      return `<text x="40" y="${y}" font-size="16" font-family="system-ui">${escapeHtml(mutation)}</text>${mirrors
        .map((mirror, mirrorIndex) => {
          const x = 320 + mirrorIndex * 160;
          return `<line x1="180" y1="${y - 5}" x2="${x - 12}" y2="${y - 5}" stroke="#98a2b3"/><rect x="${x}" y="${y - 28}" width="130" height="34" rx="6" fill="#eef8f2" stroke="#9bd4aa"/><text x="${x + 12}" y="${y - 6}" font-size="13" font-family="system-ui">${escapeHtml(mirror)}</text>`;
        })
        .join("")}`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="white"/><text x="40" y="32" font-size="20" font-family="system-ui" font-weight="700">StaleZero graph</text>${rows}</svg>`;
}

function renderGraphHtml(manifest: Manifest): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>StaleZero graph</title><style>body{font:14px system-ui,sans-serif;margin:24px;color:#172026}a{color:#175cd3}li{margin:8px 0}code{background:#eef1f3;padding:2px 4px;border-radius:4px}</style></head><body><h1>StaleZero graph</h1><p><a href="./graph.json">JSON</a> | <a href="./graph.svg">SVG</a></p><ul>${Object.entries(manifest.mutations)
    .map(([mutation, item]) => `<li><code>${escapeHtml(mutation)}</code> -> ${item.mirrors.map(escapeHtml).join(", ") || "no targets"}</li>`)
    .join("")}</ul></body></html>`;
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

