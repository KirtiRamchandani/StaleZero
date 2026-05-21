# Release Security and Provenance

StaleZero releases are designed for npm trusted publishing.

## Policy

- Use GitHub OIDC trusted publishing.
- Do not store long-lived npm publish tokens in CI.
- Publish with provenance.
- Require npm and GitHub 2FA for maintainers.
- Restrict npm package publishing rights.
- Use the protected `npm-release` GitHub environment.
- Require human approval before publishing.
- Run the release dry-run workflow before a real release.
- Run dependency review, CodeQL, npm audit, OSV scanner, license report, and SBOM workflows.
- Enable GitHub secret scanning in repository security settings.

## User Verification

After a package is published, users can inspect npm provenance from the npm package page. The package tarball should match the GitHub workflow run that produced it.

## Signing Policy

npm provenance is the signing mechanism for package releases. Git tags should be signed by maintainers when possible.

## Vulnerability Response

See [SECURITY.md](../SECURITY.md) for disclosure process and response SLA.
