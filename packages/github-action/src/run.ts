import { readFile } from "node:fs/promises";
import type { Manifest } from "@stalezero/core";
import { diffManifests, inspectManifestSecurity, mutationDiffMarkdown, securityInspectorMarkdown } from "./index.js";

async function readManifest(path: string): Promise<Manifest> {
  return JSON.parse(await readFile(path, "utf8")) as Manifest;
}

async function postComment(body: string): Promise<void> {
  const token = process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!token || !repository || !eventPath) {
    console.log(body);
    return;
  }
  const event = JSON.parse(await readFile(eventPath, "utf8")) as {
    pull_request?: { number: number; head: { sha: string } };
    issue?: { number: number };
  };
  const issueNumber = event.pull_request?.number ?? event.issue?.number;
  if (!issueNumber) {
    console.log(body);
    return;
  }
  const [owner, repo] = repository.split("/");
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/vnd.github+json",
      "content-type": "application/json",
      "x-github-api-version": "2022-11-28"
    },
    body: JSON.stringify({ body })
  });
  if (!response.ok) {
    throw new Error(`Failed to post PR comment: ${response.status} ${await response.text()}`);
  }
}

async function main(): Promise<void> {
  const beforePath = process.env.INPUT_MANIFEST_BEFORE ?? process.env.MANIFEST_BEFORE;
  const afterPath = process.env.INPUT_MANIFEST_AFTER ?? process.env.MANIFEST_AFTER;
  if (!beforePath || !afterPath) {
    throw new Error("manifest-before and manifest-after inputs are required");
  }
  const before = await readManifest(beforePath);
  const after = await readManifest(afterPath);
  const diff = diffManifests(before, after);
  const security = inspectManifestSecurity(after);
  const body = [
    mutationDiffMarkdown(diff).trim(),
    "",
    securityInspectorMarkdown(security).trim()
  ].join("\n\n");
  await postComment(body);
  if (security.some((finding) => finding.severity === "critical" || finding.severity === "high")) {
    process.exitCode = 1;
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
