import { spawn } from "node:child_process";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
export const reportsDir = resolve(root, "reports");

export async function ensureReportsDir() {
  await mkdir(reportsDir, { recursive: true });
}

export async function run(command, args = [], options = {}) {
  const started = Date.now();
  const actualCommand = process.platform === "win32" && command === "npm" ? "cmd.exe" : command;
  const actualArgs = process.platform === "win32" && command === "npm" ? ["/d", "/s", "/c", "npm", ...args] : args;
  const child = spawn(actualCommand, actualArgs, {
    cwd: options.cwd ?? root,
    shell: false,
    env: { ...process.env, ...options.env },
    stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit"
  });

  let stdout = "";
  let stderr = "";
  if (options.capture) {
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
  }

  const code = await new Promise((resolveCode) => {
    child.on("close", resolveCode);
  });

  const result = { command: [command, ...args].join(" "), code, stdout, stderr, durationMs: Date.now() - started };
  if (code !== 0 && !options.allowFailure) {
    const message = options.capture ? `${result.command}\n${stdout}\n${stderr}` : result.command;
    throw new Error(`Command failed: ${message}`);
  }
  return result;
}

export async function writeReport(name, markdown, json) {
  await ensureReportsDir();
  await writeFile(join(reportsDir, `${name}.md`), markdown);
  if (json !== undefined) {
    await writeFile(join(reportsDir, `${name}.json`), `${JSON.stringify(json, null, 2)}\n`);
  }
}

export async function packageDirs() {
  const packages = [];
  for (const dir of [
    "packages/core",
    "packages/stalezero",
    "packages/testing",
    "packages/cli",
    "packages/devtools",
    "packages/otel",
    "packages/create-stalezero-adapter-template",
    "packages/snapshot",
    "packages/github-action",
    "packages/recipes",
    "packages/pack-saas",
    "packages/pack-commerce",
    "packages/pack-auth"
  ]) {
    packages.push(resolve(root, dir));
  }
  for (const group of ["packages/adapters", "packages/bus"]) {
    const entries = await readdir(resolve(root, group), { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        packages.push(resolve(root, group, entry.name));
      }
    }
  }
  return packages.sort();
}

export async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

export function markdownTable(headers, rows) {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map((value) => String(value).replaceAll("\n", " ")).join(" | ")} |`)
  ].join("\n");
}

export function passFail(value) {
  return value ? "pass" : "fail";
}
