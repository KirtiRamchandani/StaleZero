#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

export type AppTemplateOptions = {
  appName?: string;
  packageName?: string;
  environment?: string;
};

export type TemplateFile = {
  path: string;
  content: string;
};

export function appTemplateFiles(options: AppTemplateOptions = {}): TemplateFile[] {
  const appName = options.appName ?? "my-app";
  const packageName = options.packageName ?? toPackageName(appName);
  const environment = options.environment ?? "production";
  return [
    {
      path: "package.json",
      content: `${JSON.stringify(
        {
          name: packageName,
          version: "0.1.0",
          private: true,
          type: "module",
          license: "MIT",
          scripts: {
            build: "tsc -b",
            test: "vitest run",
            start: "node dist/run.js",
            "stalezero:lint": "stalezero lint",
            "stalezero:dry-run": "stalezero dry-run UserUpdated '{\"userId\":\"1\"}'"
          },
          dependencies: {
            "@stalezero/core": "^0.1.0",
            "@stalezero/memory": "^0.1.0",
            "@stalezero/cli": "^0.1.0"
          },
          devDependencies: {
            typescript: "^5.9.0",
            vitest: "^4.0.0"
          }
        },
        null,
        2
      )}\n`
    },
    {
      path: "tsconfig.json",
      content: `${JSON.stringify(
        {
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
      path: "stalezero.config.json",
      content: `${JSON.stringify({ app: appName, environment }, null, 2)}\n`
    },
    {
      path: "README.md",
      content: `# ${packageName}\n\nStaleZero application scaffold.\n\n## Quickstart\n\n\`\`\`bash\nnpm install\nnpm run build\nnpm test\nnpm run stalezero:dry-run\n\`\`\`\n\n## Layout\n\n- \`src/stalezero.ts\` — engine bootstrap\n- \`src/mutations.ts\` — mutation graph\n- \`src/run.ts\` — local execution entrypoint\n`
    },
    {
      path: "src/stalezero.ts",
      content: `import { createStaleZero, FileReceiptStore } from "@stalezero/core";\nimport { memoryAdapter } from "@stalezero/memory";\nimport { registerMutations } from "./mutations.js";\n\nexport function createAppStaleZero() {\n  const stale = createStaleZero.production({ app: "${appName}", environment: "${environment}" });\n  stale.use(memoryAdapter("memory"));\n  stale.useReceiptStore(new FileReceiptStore({ path: ".stalezero/receipts.jsonl" }));\n  registerMutations(stale);\n  return stale;\n}\n`
    },
    {
      path: "src/mutations.ts",
      content: `import { entity, type StaleZero } from "@stalezero/core";\nimport { memoryTarget } from "@stalezero/memory";\n\nexport function registerMutations(stale: StaleZero) {\n  stale.mutation("UserUpdated", {\n    owner: "platform",\n    affects: ({ userId }: { userId: string }) => [entity("User", userId)]\n  });\n  stale.mirror("MemoryUser", {\n    when: "UserUpdated",\n    target: ({ userId }: { userId: string }) => memoryTarget(\`user:\${userId}\`)\n  });\n}\n`
    },
    {
      path: "src/run.ts",
      content: `import { createAppStaleZero } from "./stalezero.js";\n\nconst stale = createAppStaleZero();\nconst receipt = await stale.mutate("UserUpdated", { userId: "1" }).dryRun().run();\nconsole.log(receipt.toText());\n`
    },
    {
      path: "src/mutations.test.ts",
      content: `import { describe, expect, it } from "vitest";\nimport { createStaleZero } from "@stalezero/core";\nimport { memoryAdapter } from "@stalezero/memory";\nimport { registerMutations } from "./mutations.js";\n\ndescribe("mutation graph", () => {\n  it("previews UserUpdated targets", async () => {\n    const stale = createStaleZero({ app: "test" }).use(memoryAdapter("memory"));\n    registerMutations(stale);\n    const preview = await stale.preview("UserUpdated", { userId: "1" });\n    expect(preview.targets.length).toBeGreaterThan(0);\n  });\n});\n`
    },
    {
      path: ".github/workflows/stalezero.yml",
      content: `name: StaleZero\n\non:\n  pull_request:\n  push:\n    branches: [main]\n\njobs:\n  stalezero:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 22\n          cache: npm\n      - run: npm ci\n      - run: npm run build\n      - run: npm test\n      - run: npx stalezero lint\n`
    },
    {
      path: ".gitignore",
      content: "node_modules\ndist\n.stalezero/receipts.jsonl\n"
    }
  ];
}

export async function writeAppTemplate(directory: string, options: AppTemplateOptions = {}): Promise<TemplateFile[]> {
  const files = appTemplateFiles(options);
  const root = resolve(directory);
  for (const file of files) {
    const output = join(root, file.path);
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, file.content);
  }
  return files;
}

async function main(): Promise<void> {
  const [, , directory = "stalezero-app", ...args] = process.argv;
  const options = parseArgs(args);
  options.appName = options.appName ?? directory;
  await writeAppTemplate(directory, options);
  console.log(`Created StaleZero app in ${resolve(directory)}`);
}

function parseArgs(args: string[]): AppTemplateOptions {
  const output: AppTemplateOptions = {};
  for (const arg of args) {
    const [key, value] = arg.replace(/^--/, "").split("=");
    if (key === "app" && value) {
      output.appName = value;
    }
    if (key === "package" && value) {
      output.packageName = value;
    }
    if (key === "environment" && value) {
      output.environment = value;
    }
  }
  return output;
}

function toPackageName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "stalezero-app";
}

if (process.argv[1]?.endsWith("index.js")) {
  void main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
