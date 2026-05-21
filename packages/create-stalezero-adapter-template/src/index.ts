#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

export type AdapterTemplateOptions = {
  packageName?: string;
  adapterName?: string;
  targetAdapter?: string;
};

export type TemplateFile = {
  path: string;
  content: string;
};

export function adapterTemplateFiles(options: AdapterTemplateOptions = {}): TemplateFile[] {
  const packageName = options.packageName ?? "@stalezero/example-adapter";
  const adapterName = toIdentifier(options.adapterName ?? "exampleAdapter");
  const targetAdapter = options.targetAdapter ?? "example";
  return [
    {
      path: "package.json",
      content: `${JSON.stringify(
        {
          name: packageName,
          version: "0.1.0",
          type: "module",
          license: "MIT",
          sideEffects: false,
          exports: { ".": { types: "./dist/index.d.ts", import: "./dist/index.js" } },
          files: ["dist"],
          scripts: { build: "tsc -b", test: "vitest run" },
          dependencies: { "@stalezero/core": "^0.1.0" },
          devDependencies: { typescript: "^5.9.0", vitest: "^4.0.0" }
        },
        null,
        2
      )}\n`
    },
    {
      path: "tsconfig.json",
      content: `${JSON.stringify(
        {
          extends: "./tsconfig.base.json",
          compilerOptions: {
            target: "ES2022",
            module: "NodeNext",
            moduleResolution: "NodeNext",
            declaration: true,
            strict: true,
            outDir: "dist",
            rootDir: "src"
          },
          include: ["src/**/*.ts"]
        },
        null,
        2
      )}\n`
    },
    {
      path: "README.md",
      content: `# ${packageName}\n\nAdapter package for StaleZero.\n\n## Usage\n\n\`\`\`ts\nimport { createStaleZero } from "@stalezero/core";\nimport { ${adapterName}, ${targetAdapter}Target } from "${packageName}";\n\nconst stale = createStaleZero();\nstale.use(${adapterName}({ client }));\nawait stale.mutate("ThingChanged", { id: "1" }).target(${targetAdapter}Target("thing:1")).run();\n\`\`\`\n`
    },
    {
      path: "src/index.ts",
      content: `import type { Adapter, TargetRef } from "@stalezero/core";\n\nexport type ${capitalize(targetAdapter)}ClientLike = {\n  invalidate: (key: string, meta?: Record<string, unknown>) => Promise<unknown> | unknown;\n};\n\nexport type ${capitalize(targetAdapter)}AdapterOptions = {\n  name?: string;\n  client: ${capitalize(targetAdapter)}ClientLike;\n};\n\nexport function ${adapterName}(options: ${capitalize(targetAdapter)}AdapterOptions): Adapter<TargetRef<"${targetAdapter}">> {\n  return {\n    name: options.name ?? "${targetAdapter}",\n    execute: async (target) => {\n      if (target.action !== "invalidate") {\n        throw new Error("${targetAdapter} adapter does not support " + target.action);\n      }\n      await options.client.invalidate(target.key, target.meta);\n    }\n  };\n}\n\nexport function ${targetAdapter}Target(key: string, options: Omit<TargetRef<"${targetAdapter}">, "adapter" | "key" | "action"> = {}): TargetRef<"${targetAdapter}"> {\n  return { adapter: "${targetAdapter}", key, action: "invalidate", ...options };\n}\n`
    },
    {
      path: "src/index.test.ts",
      content: `import { describe, expect, it, vi } from "vitest";\nimport { createStaleZero } from "@stalezero/core";\nimport { ${adapterName}, ${targetAdapter}Target } from "./index.js";\n\ndescribe("${targetAdapter} adapter", () => {\n  it("invalidates a supported target", async () => {\n    const invalidate = vi.fn();\n    const stale = createStaleZero().use(${adapterName}({ client: { invalidate } }));\n    const receipt = await stale.mutate("ThingChanged", {}).target(${targetAdapter}Target("thing:1")).run();\n\n    expect(receipt.status).toBe("success");\n    expect(invalidate).toHaveBeenCalledWith("thing:1", undefined);\n  });\n});\n`
    },
    {
      path: "examples/minimal.mjs",
      content: `import { createStaleZero } from "@stalezero/core";\nimport { ${adapterName}, ${targetAdapter}Target } from "../dist/index.js";\n\nconst stale = createStaleZero().use(${adapterName}({ client: { invalidate: (key) => console.log("invalidate", key) } }));\nconst receipt = await stale.mutate("ThingChanged", {}).target(${targetAdapter}Target("thing:1")).run();\nconsole.log(receipt.toText());\n`
    }
  ];
}

export async function writeAdapterTemplate(directory: string, options: AdapterTemplateOptions = {}): Promise<TemplateFile[]> {
  const files = adapterTemplateFiles(options);
  const root = resolve(directory);
  for (const file of files) {
    const output = join(root, file.path);
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, file.content);
  }
  return files;
}

async function main(): Promise<void> {
  const [, , directory = "stalezero-adapter", ...args] = process.argv;
  const options = parseArgs(args);
  await writeAdapterTemplate(directory, options);
  console.log(`Created adapter template in ${resolve(directory)}`);
}

function parseArgs(args: string[]): AdapterTemplateOptions {
  const output: AdapterTemplateOptions = {};
  for (const arg of args) {
    const [key, value] = arg.replace(/^--/, "").split("=");
    if (key === "package" && value) {
      output.packageName = value;
    }
    if (key === "adapter" && value) {
      output.adapterName = value;
    }
    if (key === "target" && value) {
      output.targetAdapter = value;
    }
  }
  return output;
}

function toIdentifier(value: string): string {
  return value.replace(/[^a-zA-Z0-9_$]/g, "");
}

function capitalize(value: string): string {
  const clean = toIdentifier(value);
  return `${clean.slice(0, 1).toUpperCase()}${clean.slice(1)}`;
}

if (process.argv[1]?.endsWith("index.js")) {
  void main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
