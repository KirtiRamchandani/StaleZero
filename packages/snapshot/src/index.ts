import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { MutationSnapshot, MutationSnapshotData, SnapshotDiff, StaleZero } from "@stalezero/core";

export type SnapshotFileOptions = {
  dir?: string;
  name?: string;
};

export async function createMutationSnapshot(
  stale: Pick<StaleZero, "snapshot">,
  mutation: string,
  input: unknown
): Promise<MutationSnapshot> {
  return stale.snapshot(mutation, input);
}

export async function writeMutationSnapshot(
  stale: Pick<StaleZero, "snapshot">,
  mutation: string,
  input: unknown,
  options: SnapshotFileOptions = {}
): Promise<{ path: string; snapshot: MutationSnapshot }> {
  const snapshot = await stale.snapshot(mutation, input);
  const path = resolve(options.dir ?? "__stalezero_snapshots__", options.name ?? `${mutation}.snap.json`);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(snapshot.toJSON(), null, 2)}\n`);
  return { path, snapshot };
}

export async function readMutationSnapshot(path: string): Promise<MutationSnapshotData> {
  return JSON.parse(await readFile(resolve(path), "utf8")) as MutationSnapshotData;
}

export async function compareSnapshotFiles(
  stale: Pick<StaleZero, "compareSnapshots">,
  beforePath: string,
  afterPath: string
): Promise<SnapshotDiff> {
  return stale.compareSnapshots(await readMutationSnapshot(beforePath), await readMutationSnapshot(afterPath));
}

export function snapshotMarkdown(snapshot: MutationSnapshotData): string {
  return [
    `## ${snapshot.mutation}`,
    "",
    `Risk: ${snapshot.risk.level}`,
    "",
    "Targets:",
    ...(snapshot.targets.length ? snapshot.targets.map((target) => `- ${target.adapter}:${target.action}:${target.key}`) : ["- none"])
  ].join("\n");
}

export function snapshotDiffMarkdown(diff: Pick<SnapshotDiff, "mutation" | "added" | "removed" | "risk">): string {
  return [
    `## Mutation blast radius changed: ${diff.mutation}`,
    "",
    "Removed:",
    ...(diff.removed.length ? diff.removed.map((target) => `- ${target}`) : ["- none"]),
    "",
    "Added:",
    ...(diff.added.length ? diff.added.map((target) => `- ${target}`) : ["- none"]),
    "",
    `Risk: ${diff.risk}`
  ].join("\n");
}
