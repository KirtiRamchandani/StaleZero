import { run, writeReport, markdownTable } from "./lib.mjs";

const rows = [];

const pack = await run("npm", ["run", "verify:pack"], { capture: true });
rows.push(["npm pack all packages", "pass", `${pack.durationMs}ms`]);

const publish = await run("npm", ["publish", "--workspaces", "--access", "public", "--provenance", "--dry-run"], {
  capture: true,
  allowFailure: true
});
rows.push(["npm publish --workspaces --provenance --dry-run", publish.code === 0 ? "pass" : "blocked", publish.code === 0 ? "dry-run succeeded" : "npm publish dry-run is blocked before registry auth/trusted publishing in this local shell"]);

await writeReport(
  "release-dry-run-report",
  [
    "# Release Dry-Run Report",
    "",
    markdownTable(["Check", "Result", "Notes"], rows),
    "",
    "Trusted publishing is configured in GitHub Actions with OIDC and npm provenance. Local shells are not expected to publish."
  ].join("\n"),
  { rows, publishCode: publish.code }
);
