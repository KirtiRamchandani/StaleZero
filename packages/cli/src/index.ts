#!/usr/bin/env node
import { createServer } from "node:http";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { createStaleZero, MemoryReceiptStore, type Manifest, type Receipt, type ServiceContract, type TargetRef } from "@stalezero/core";

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
        throw new Error("Usage: stalezero replay <receipt-file> [--sandbox|--dry-run|--safe-replay|--force] [--target=x] [--adapter=x] [--failed-only]");
      }
      const mode = args.includes("--force")
        ? "force"
        : args.includes("--safe-replay")
          ? "safe-replay"
          : args.includes("--dry-run")
            ? "dry-run"
            : "sandbox";
      const receipt = JSON.parse(await readReceipt(idOrFile)) as Receipt;
      const result = await createStaleZero().replay(receipt, {
        mode,
        target: readFlag(args, "--target"),
        adapter: readFlag(args, "--adapter"),
        failedOnly: args.includes("--failed-only"),
        requiredOnly: args.includes("--required-only"),
        safeOnly: args.includes("--safe-only"),
        currentGraph: args.includes("--current-graph")
      });
      console.log(result.toText());
    }
  },
  {
    name: "prove",
    description: "Run adapter proof checks for a receipt",
    run: async (args) => {
      const idOrFile = args[0];
      if (!idOrFile) {
        throw new Error("Usage: stalezero prove <receipt-file> [--ci] [--retries=n] [--timeout-ms=n]");
      }
      const receipt = JSON.parse(await readReceipt(idOrFile)) as Receipt;
      const proof = await createStaleZero().prove(receipt, {
        ci: args.includes("--ci"),
        retries: Number(readFlag(args, "--retries") ?? 0),
        timeoutMs: Number(readFlag(args, "--timeout-ms") ?? 3000)
      });
      console.log(proof.toText());
    }
  },
  {
    name: "lint",
    description: "Lint mutation graph architecture from a manifest",
    run: async (args) => {
      const manifest = await readManifest(args.find((arg) => !arg.startsWith("--")));
      const report = lintManifest(manifest);
      console.log(report.text);
      if (args.includes("--ci") && report.failed > 0) {
        process.exitCode = 1;
      }
    }
  },
  {
    name: "explain-stale",
    description: "Explain likely stale-data causes for an entity",
    run: async (args) => {
      const entityKey = args[0];
      if (!entityKey) {
        throw new Error("Usage: stalezero explain-stale <Entity:id>");
      }
      const stale = await localStaleFromFiles();
      console.log((await stale.explainStale(entityKey)).toText());
    }
  },
  {
    name: "undo",
    description: "Preview or run a reversible mutation undo",
    run: async (args) => {
      const idOrFile = args[0];
      if (!idOrFile) {
        throw new Error("Usage: stalezero undo <receipt-file> [--force]");
      }
      const receipt = JSON.parse(await readReceipt(idOrFile)) as Receipt;
      const stale = createStaleZero();
      stale.undoable(receipt.mutation, {
        undo: () => undefined,
        targets: ({ receipt }) => receipt.targets.filter((targetRef) => isCliSafeReplayTarget(targetRef)).map((targetRef) => ({ ...targetRef, required: false }))
      });
      if (args.includes("--force")) {
        const result = await stale.undo(receipt);
        console.log(result.toText());
        return;
      }
      const preview = await stale.previewUndo(receipt);
      console.log(preview.toText());
    }
  },
  {
    name: "playbook",
    description: "Print deterministic recovery steps for a receipt",
    run: async (args) => {
      const idOrFile = args[0];
      if (!idOrFile) {
        throw new Error("Usage: stalezero playbook <receipt-file>");
      }
      const receipt = JSON.parse(await readReceipt(idOrFile)) as Receipt;
      console.log((await createStaleZero().playbook(receipt)).toText());
    }
  },
  {
    name: "incident",
    description: "Export a failed receipt as an incident note",
    run: async (args) => {
      const idOrFile = args[0];
      if (!idOrFile) {
        throw new Error("Usage: stalezero incident <receipt-file>");
      }
      const receipt = JSON.parse(await readReceipt(idOrFile)) as Receipt;
      console.log(await createStaleZero().incident(receipt));
    }
  },
  {
    name: "canary",
    description: "Run a mutation wiring canary without touching real systems",
    run: async (args) => {
      const mutation = args[0];
      if (!mutation) {
        throw new Error("Usage: stalezero canary <mutation> [json|--key=value]");
      }
      const input = parseInputArgs(args.slice(1));
      const stale = createStaleZero();
      const manifest = await tryReadManifest();
      if (manifest) {
        stale.loadManifest(manifest);
      }
      console.log((await stale.canary(mutation, input)).toText());
    }
  },
  {
    name: "drift",
    description: "Scan an entity for graph drift",
    run: async (args) => {
      const entityName = args[0];
      const id = args[1];
      if (!entityName || !id) {
        throw new Error("Usage: stalezero drift <entity> <id>");
      }
      console.log((await createStaleZero().drift.scan(entityName, id)).toText());
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
    name: "contract-check",
    description: "Check service mutation event contracts",
    run: async (args) => {
      const file = resolve(args[0] ?? ".stalezero/service-contracts.json");
      if (!(await exists(file))) {
        console.log("No service contracts found");
        return;
      }
      const stale = createStaleZero();
      const data = JSON.parse(await readFile(file, "utf8")) as {
        emits?: ServiceContract[];
        consumes?: ServiceContract[];
      };
      for (const contract of data.emits ?? []) {
        stale.emits(contract.event, contract.schema, { service: contract.service });
      }
      for (const contract of data.consumes ?? []) {
        stale.consumes(contract.event, contract.schema, { service: contract.service });
      }
      const report = stale.contractCheck();
      console.log(report.toText());
      if (!report.passed) {
        process.exitCode = 1;
      }
    }
  },
  {
    name: "schema",
    description: "Check or diff event schemas",
    run: async (args) => {
      const action = args[0] ?? "check";
      const file = resolve(args[1] ?? ".stalezero/schemas.json");
      if (!(await exists(file))) {
        console.log("No schema registry found");
        return;
      }
      const data = JSON.parse(await readFile(file, "utf8")) as Record<string, ServiceContract["schema"]>;
      const stale = createStaleZero();
      const registry = stale.schemaRegistry();
      for (const [event, schema] of Object.entries(data)) {
        registry.register(event, schema);
      }
      if (action === "diff") {
        for (const event of Object.keys(data)) {
          console.log(registry.diff(event, data[event]).toText());
        }
        return;
      }
      console.log(registry.docs());
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
      await writeDocsAsCode(manifest);
      console.log(`Wrote ${markdownOutput}`);
      console.log(`Wrote ${graphOutput}`);
      console.log("Wrote docs/mutations, docs/entities, and docs/adapters");
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
  },
  {
    name: "cost",
    description: "Estimate mutation consequence cost",
    run: async (args) => {
      const mutation = args[0];
      if (!mutation) {
        throw new Error("Usage: stalezero cost <mutation> [json|--key=value]");
      }
      const input = parseInputArgs(args.slice(1));
      const stale = createStaleZero();
      const manifest = await tryReadManifest();
      if (manifest) {
        stale.loadManifest(manifest);
      }
      const report = await stale.cost(mutation, input);
      console.log(`Cost: ${report.level} (${report.score})`);
      console.log(`Targets: ${report.targets}`);
      for (const [adapter, count] of Object.entries(report.adapterCalls)) {
        console.log(`- ${adapter}: ${count}`);
      }
      for (const reason of report.reasons) {
        console.log(`Reason: ${reason}`);
      }
    }
  },
  {
    name: "heatmap",
    description: "Summarize hot, slow, and failure-prone mutations from local receipts",
    run: async () => {
      const report = await (await localStaleFromFiles()).heatmap();
      console.log("Hot mutations:");
      for (const item of report.hotMutations) {
        console.log(`- ${item.mutation} ${item.count} receipts p95=${item.p95Ms}ms failures=${Math.round(item.failureRate * 1000) / 10}%`);
      }
      console.log("");
      console.log("Slow targets:");
      for (const item of report.slowTargets.slice(0, 10)) {
        console.log(`- ${item.target} p95=${item.p95Ms}ms failures=${Math.round(item.failureRate * 1000) / 10}%`);
      }
    }
  },
  {
    name: "optimize-cost",
    aliases: ["optimize"],
    description: "Find repeated or broad invalidation work from local receipts",
    run: async () => {
      console.log((await (await localStaleFromFiles()).optimizeCost()).toText());
    }
  },
  {
    name: "score",
    description: "Calculate a mutation graph readiness score",
    run: async () => {
      const manifest = await tryReadManifest();
      if (manifest) {
        const lint = lintManifest(manifest);
        const score = Math.max(0, 100 - lint.failed * 15 - lint.warned * 5);
        console.log(`StaleZero Project Score: ${score}/100`);
        console.log("");
        console.log(lint.text);
        return;
      }
      console.log((await (await localStaleFromFiles()).score()).toText());
    }
  },
  {
    name: "badge",
    description: "Write a score badge SVG",
    run: async () => {
      const badge = await (await localStaleFromFiles()).badge();
      const output = resolve(".stalezero/badge.svg");
      await mkdir(dirname(output), { recursive: true });
      await writeFile(output, badge.svg);
      console.log(`Wrote ${output}`);
      console.log(`${badge.label}: ${badge.message}`);
    }
  },
  {
    name: "ownership-map",
    description: "Write mutation and target ownership JSON from a manifest",
    run: async (args) => {
      const manifest = await readManifest(args[0]);
      const owners = ownershipFromManifest(manifest);
      const output = resolve(".stalezero/ownership.json");
      await mkdir(dirname(output), { recursive: true });
      await writeFile(output, `${JSON.stringify(owners, null, 2)}\n`);
      console.log(`Wrote ${output}`);
    }
  },
  {
    name: "runbooks",
    description: "Generate operational runbooks from a manifest",
    run: async (args) => {
      const manifest = await readManifest(args[0]);
      const folder = resolve("runbooks");
      await mkdir(folder, { recursive: true });
      for (const [mutation, item] of Object.entries(manifest.mutations)) {
        await writeFile(join(folder, `${safeFileName(mutation)}.md`), renderRunbook(mutation, item.owner, item.mirrors));
      }
      console.log(`Wrote ${folder}`);
    }
  },
  {
    name: "browser-helper",
    description: "Write the dev-only browser stale-data helper script",
    run: async () => {
      const output = resolve(".stalezero/browser-helper.js");
      await mkdir(dirname(output), { recursive: true });
      await writeFile(output, createStaleZero().browserHelper());
      console.log(`Wrote ${output}`);
    }
  },
  {
    name: "chaos",
    description: "Print a local chaos-mode configuration for resilience tests",
    run: async (args) => {
      const config = {
        adapter: readFlag(args, "--adapter"),
        failRate: Number(readFlag(args, "--fail-rate") ?? 0),
        slowRate: Number(readFlag(args, "--slow-rate") ?? 0),
        maxDelayMs: Number(readFlag(args, "--max-delay-ms") ?? 250)
      };
      createStaleZero().chaos(config);
      console.log("Chaos mode configured");
      console.log(JSON.stringify(config, null, 2));
    }
  },
  {
    name: "watch",
    description: "Watch local receipt files and print a live mutation feed",
    run: async (args) => {
      const once = args.includes("--once");
      const folder = resolve(".stalezero/receipts");
      await printReceiptFeed(folder);
      if (once) {
        return;
      }
      console.log("Watching StaleZero receipts...");
      setInterval(() => {
        void printReceiptFeed(folder);
      }, 2000);
    }
  },
  {
    name: "scan",
    description: "Scan source for migration candidates or duplicate invalidation work",
    run: async (args) => {
      const mode = args[0] === "duplicates" ? "duplicates" : "migration";
      const folder = resolve(args[1] ?? "src");
      const result = await scanSource(folder, mode);
      console.log(`${mode === "duplicates" ? "Duplicate work" : "Migration"} scan`);
      if (result.findings.length === 0) {
        console.log("No findings");
        return;
      }
      for (const finding of result.findings) {
        console.log(`- ${finding.file}${finding.line ? `:${finding.line}` : ""} ${finding.pattern}${finding.suggestion ? ` -> ${finding.suggestion}` : ""}`);
      }
    }
  },
  {
    name: "diagnostics",
    description: "Write editor diagnostics from a manifest",
    run: async (args) => {
      const manifest = await readManifest(args[0]);
      const diagnostics = Object.entries(manifest.mutations).flatMap(([mutation, item]) => {
        const output = [];
        if (!item.owner) {
          output.push({ code: "missing-owner", severity: "warning", message: `Mutation ${mutation} has no owner`, subject: mutation });
        }
        if (item.mirrors.length === 0) {
          output.push({ code: "no-targets", severity: "info", message: `Mutation ${mutation} has no targets`, subject: mutation });
        }
        return output;
      });
      const output = resolve(".stalezero/diagnostics.json");
      await mkdir(dirname(output), { recursive: true });
      await writeFile(output, `${JSON.stringify(diagnostics, null, 2)}\n`);
      console.log(`Wrote ${output}`);
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

async function localStaleFromFiles(): Promise<ReturnType<typeof createStaleZero>> {
  const stale = createStaleZero();
  const manifest = await tryReadManifest();
  if (manifest) {
    stale.loadManifest(manifest);
  }
  const store = new MemoryReceiptStore();
  for (const receipt of await readLocalReceipts()) {
    await store.save(receipt);
  }
  stale.useReceiptStore(store);
  return stale;
}

async function readLocalReceipts(): Promise<Receipt[]> {
  const folder = resolve(".stalezero/receipts");
  if (!(await exists(folder))) {
    return [];
  }
  const receipts: Receipt[] = [];
  for (const file of (await readdir(folder)).filter((item) => item.endsWith(".json"))) {
    receipts.push(JSON.parse(await readFile(join(folder, file), "utf8")) as Receipt);
  }
  return receipts;
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

function lintManifest(manifest: Manifest): { failed: number; warned: number; text: string } {
  const findings: Array<{ severity: "info" | "warn" | "error"; subject: string; message: string }> = [];
  for (const [mutation, item] of Object.entries(manifest.mutations)) {
    if (!item.owner) {
      findings.push({ severity: "warn", subject: mutation, message: "mutation has no owner" });
    }
    if (item.mirrors.length === 0) {
      findings.push({ severity: "info", subject: mutation, message: "mutation has no targets" });
    }
    if (item.mirrors.length > 50) {
      findings.push({ severity: "warn", subject: mutation, message: "mutation has too many targets" });
    }
    if (/delete|purge|tenant/i.test(mutation)) {
      findings.push({ severity: "warn", subject: mutation, message: "destructive mutation should have an approval gate" });
    }
  }
  for (const [targetName, mirror] of Object.entries(manifest.mirrors)) {
    if (!mirror.owner) {
      findings.push({ severity: "warn", subject: targetName, message: "target has no owner" });
    }
    if (mirror.when.length === 0) {
      findings.push({ severity: "error", subject: targetName, message: "target is never reached" });
    }
    if (/redis/i.test(targetName) && targetName.includes("*")) {
      findings.push({ severity: "error", subject: targetName, message: "Redis wildcard requires an explicit unsafe review" });
    }
    if (/http|webhook/i.test(targetName) && !/allow|signed|safe/i.test(targetName)) {
      findings.push({ severity: "warn", subject: targetName, message: "HTTP target should document allowlist and signing" });
    }
  }
  const failed = findings.filter((finding) => finding.severity === "error").length;
  const warned = findings.filter((finding) => finding.severity === "warn").length;
  const passed = Math.max(0, 12 - failed);
  const text = [
    "StaleZero Graph Lint",
    "",
    ...(findings.length ? findings.map((finding) => `${finding.severity} ${finding.subject} ${finding.message}`) : ["No findings"]),
    "",
    `${passed} passed, ${failed} failed`
  ].join("\n");
  return { failed, warned, text };
}

function ownershipFromManifest(manifest: Manifest): Record<string, { mutations: string[]; targets: string[] }> {
  const owners: Record<string, { mutations: string[]; targets: string[] }> = {};
  const add = (owner: string | undefined, kind: "mutations" | "targets", name: string) => {
    const key = owner ?? "unowned";
    owners[key] = owners[key] ?? { mutations: [], targets: [] };
    owners[key][kind].push(name);
  };
  for (const [mutation, item] of Object.entries(manifest.mutations)) {
    add(item.owner, "mutations", mutation);
  }
  for (const [targetName, item] of Object.entries(manifest.mirrors)) {
    add(item.owner, "targets", targetName);
  }
  return owners;
}

function renderRunbook(mutation: string, owner: string | undefined, targets: string[]): string {
  return [
    `# ${mutation}`,
    "",
    `Owner: ${owner ?? "unowned"}`,
    "",
    "## What it does",
    `Runs declared consequences for ${mutation}.`,
    "",
    "## Targets",
    ...(targets.length ? targets.map((targetName) => `- ${targetName}`) : ["- no targets declared"]),
    "",
    "## Failure response",
    "- inspect the receipt",
    "- replay failed safe targets only",
    "- prove required targets",
    "- compare the receipt against the current manifest",
    ""
  ].join("\n");
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

function readFlag(args: string[], name: string): string | undefined {
  const prefixed = args.find((arg) => arg.startsWith(`${name}=`));
  if (prefixed) {
    return prefixed.slice(name.length + 1);
  }
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function isCliSafeReplayTarget(targetRef: TargetRef): boolean {
  return targetRef.idempotent === true || ["delete", "invalidate", "refetch", "revalidate", "remove"].includes(targetRef.action);
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

async function writeDocsAsCode(manifest: Manifest): Promise<void> {
  const mutationDir = resolve("docs", "mutations");
  const entityDir = resolve("docs", "entities");
  const adapterDir = resolve("docs", "adapters");
  await mkdir(mutationDir, { recursive: true });
  await mkdir(entityDir, { recursive: true });
  await mkdir(adapterDir, { recursive: true });

  for (const [mutation, item] of Object.entries(manifest.mutations)) {
    const body = [
      `# ${mutation}`,
      "",
      item.owner ? `Owner: ${item.owner}` : "Owner: not declared",
      "",
      "## Targets",
      ...(item.mirrors.length ? item.mirrors.map((mirror) => `- ${mirror}`) : ["- no targets declared"]),
      "",
      "## Security",
      "- keep schema, actor, tenant, and target safety checks wired before production use",
      ""
    ].join("\n");
    await writeFile(join(mutationDir, `${safeFileName(mutation)}.md`), body);
  }

  for (const adapter of manifest.adapters) {
    const mirrors = Object.entries(manifest.mirrors).filter(([name]) => name.toLowerCase().includes(adapter.toLowerCase()));
    await writeFile(
      join(adapterDir, `${safeFileName(adapter)}.md`),
      [`# ${adapter}`, "", "## Targets", ...(mirrors.length ? mirrors.map(([name]) => `- ${name}`) : ["- no manifest targets found"]), ""].join("\n")
    );
  }

  const entities = new Set<string>();
  for (const mutation of Object.keys(manifest.mutations)) {
    const match = mutation.match(/^([A-Z][a-zA-Z0-9]+)/);
    if (match?.[1]) {
      entities.add(match[1].replace(/(Updated|Deleted|Created|Changed|Cancelled)$/u, ""));
    }
  }
  for (const name of entities) {
    await writeFile(join(entityDir, `${safeFileName(name)}.md`), [`# ${name}`, "", "Generated from mutation names in the manifest.", ""].join("\n"));
  }
}

async function printReceiptFeed(folder: string): Promise<void> {
  if (!(await exists(folder))) {
    console.log("No local receipts found");
    return;
  }
  const files = (await readdir(folder)).filter((file) => file.endsWith(".json")).slice(-10);
  for (const file of files) {
    const receipt = JSON.parse(await readFile(join(folder, file), "utf8")) as Receipt;
    const marker = receipt.status === "success" || receipt.status === "dry-run" ? "ok" : "fail";
    console.log(`${marker} ${receipt.mutation} -> ${receipt.targets.length} targets -> ${receipt.status}`);
  }
}

async function scanSource(folder: string, mode: "migration" | "duplicates"): Promise<{ findings: Array<{ file: string; line?: number; pattern: string; suggestion?: string }> }> {
  if (!(await exists(folder))) {
    return { findings: [] };
  }
  const files = await sourceFiles(folder);
  const patterns = [
    { pattern: "queryClient.invalidateQueries", suggestion: "declare a query target" },
    { pattern: "mutate(", suggestion: "declare an SWR target" },
    { pattern: "revalidateTag", suggestion: "declare a Next tag target" },
    { pattern: "redis.del", suggestion: "declare a Redis target" },
    { pattern: "store.dispatch", suggestion: "declare a Redux target" },
    { pattern: "io.emit", suggestion: "declare a socket target" }
  ];
  const findings: Array<{ file: string; line?: number; pattern: string; suggestion?: string }> = [];
  const signatures = new Map<string, string[]>();

  for (const file of files) {
    const body = await readFile(file, "utf8");
    const lines = body.split(/\r?\n/u);
    const seenInFile: string[] = [];
    lines.forEach((line, index) => {
      for (const item of patterns) {
        if (line.includes(item.pattern)) {
          seenInFile.push(item.pattern);
          if (mode === "migration") {
            findings.push({ file, line: index + 1, pattern: item.pattern, suggestion: item.suggestion });
          }
        }
      }
    });
    const signature = seenInFile.sort().join("+");
    if (signature) {
      signatures.set(signature, [...(signatures.get(signature) ?? []), file]);
    }
  }

  if (mode === "duplicates") {
    for (const [signature, repeatedFiles] of signatures) {
      if (repeatedFiles.length > 1) {
        for (const file of repeatedFiles) {
          findings.push({ file, pattern: signature, suggestion: "move this repeated consequence set into one mutation" });
        }
      }
    }
  }

  return { findings };
}

async function sourceFiles(folder: string): Promise<string[]> {
  const entries = await readdir(folder, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await sourceFiles(path)));
    } else if (/\.(mjs|cjs|js|jsx|ts|tsx)$/u.test(entry.name)) {
      files.push(path);
    }
  }
  return files;
}

function safeFileName(value: string): string {
  return value.replace(/[^a-z0-9._-]+/giu, "-").replace(/^-|-$/gu, "") || "item";
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

