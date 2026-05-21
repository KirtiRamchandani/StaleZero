import { performance } from "node:perf_hooks";
import { stat } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createStaleZero, customTarget } from "../packages/core/dist/index.js";
import { writeReport, markdownTable } from "./lib.mjs";

function bench(name, fn, iterations = 50) {
  const samples = [];
  return Promise.resolve()
    .then(async () => {
      for (let index = 0; index < iterations; index += 1) {
        const started = performance.now();
        await fn();
        samples.push(performance.now() - started);
      }
      samples.sort((a, b) => a - b);
      return {
        name,
        iterations,
        minMs: samples[0],
        p50Ms: samples[Math.floor(samples.length * 0.5)],
        p95Ms: samples[Math.floor(samples.length * 0.95)],
        maxMs: samples[samples.length - 1]
      };
    });
}

function createGraph(mutations, targets) {
  const stale = createStaleZero({ execution: { concurrency: 100 } });
  stale.use({ name: "memory", execute: () => undefined });
  for (let mutationIndex = 0; mutationIndex < mutations; mutationIndex += 1) {
    const mutation = `Mutation${mutationIndex}`;
    stale.mutation(mutation, {});
    for (let targetIndex = 0; targetIndex < targets / mutations; targetIndex += 1) {
      stale.mirror(`${mutation}Target${targetIndex}`, {
        when: mutation,
        target: () => customTarget("memory", `${mutation}:${targetIndex}`)
      });
    }
  }
  return stale;
}

await import("../packages/core/dist/index.js");

const small = createGraph(10, 100);
const medium = createGraph(100, 1000);
const large = createGraph(1000, 10000);
const largeManifest = large.generateManifest();
const duplicateTargets = createStaleZero({ execution: { concurrency: 100 } }).use({ name: "memory", execute: () => undefined });
duplicateTargets.mutation("Dedupe", {
  targets: () => Array.from({ length: 1000 }, () => customTarget("memory", "same-key"))
});

const heapBefore = process.memoryUsage().heapUsed;

const results = [
  await bench("preview: 10 mutations / 100 targets", () => small.preview("Mutation0", {})),
  await bench("changed no adapters: 10 mutations / 100 targets", () => createStaleZero().changed("AdHoc", {})),
  await bench("changed fake adapters: 10 mutations / 100 targets", () => small.changed("Mutation0", {})),
  await bench("receipt generation overhead", () => createStaleZero().changed("ReceiptOnly", {})),
  await bench("dedupe overhead: 1,000 duplicate targets", () => duplicateTargets.changed("Dedupe", {}), 25),
  await bench("preview: 100 mutations / 1,000 targets", () => medium.preview("Mutation0", {}), 25),
  await bench("preview: 1,000 mutations / 10,000 targets", () => large.preview("Mutation0", {}), 10),
  await bench("manifest generation: 1,000 mutations / 10,000 targets", () => large.generateManifest(), 10),
  await bench("manifest loading: 1,000 mutations / 10,000 targets", () => createStaleZero().loadManifest(largeManifest).generateManifest(), 10),
  await bench("cold import: @stalezero/core", async () => {
    await import(`${pathToFileURL(resolve("packages/core/dist/index.js")).href}?bench=${Math.random()}`);
  }, 5)
];

const heapAfter = process.memoryUsage().heapUsed;
const coreEntryBytes = (await stat(resolve("packages/core/dist/index.js"))).size;

const rows = results.map((result) => [
  result.name,
  result.iterations,
  result.minMs.toFixed(3),
  result.p50Ms.toFixed(3),
  result.p95Ms.toFixed(3),
  result.maxMs.toFixed(3)
]);

await writeReport(
  "benchmark-report",
  [
    "# Benchmark Report",
    "",
    markdownTable(["Scenario", "Runs", "min ms", "p50 ms", "p95 ms", "max ms"], rows),
    "",
    "## Size and memory",
    "",
    markdownTable(["Metric", "Value"], [
      ["Core ESM entry", `${(coreEntryBytes / 1024).toFixed(2)} kB`],
      ["Heap delta during benchmark", `${((heapAfter - heapBefore) / 1024 / 1024).toFixed(2)} MB`],
      ["Source maps policy", "generated in dist for debugging; published tarballs include them intentionally"]
    ]),
    ""
  ].join("\n"),
  { results, coreEntryBytes, heapDeltaBytes: heapAfter - heapBefore }
);
