import { run, writeReport, markdownTable } from "./lib.mjs";

const rows = [];
const audit = await run("npm", ["audit", "--audit-level=moderate"], { capture: true, allowFailure: true });
rows.push(["npm audit --audit-level=moderate", audit.code === 0 ? "pass" : "review", audit.stdout.trim().split("\n").at(-1) ?? ""]);

await writeReport(
  "security-hardening-report",
  [
    "# Security Hardening Report",
    "",
    markdownTable(["Check", "Result", "Notes"], rows),
    "",
    "Configured controls:",
    "",
    "- Trusted publishing workflow uses GitHub OIDC and npm provenance.",
    "- Long-lived npm token is not required by the release workflow.",
    "- Release workflow uses a protected `npm-release` environment.",
    "- Dependency review workflow is present.",
    "- CodeQL workflow is present.",
    "- Security audit workflow is present.",
    "- SECURITY.md documents disclosure, SLA, and supported versions.",
    "- Provenance verification notes are documented in `docs/release-security.md`."
  ].join("\n"),
  { rows }
);
