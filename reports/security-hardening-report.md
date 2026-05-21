# Security Hardening Report

| Check | Result | Notes |
| --- | --- | --- |
| npm audit --audit-level=moderate | pass | found 0 vulnerabilities |

Configured controls:

- Trusted publishing workflow uses GitHub OIDC and npm provenance.
- Long-lived npm token is not required by the release workflow.
- Release workflow uses a protected `npm-release` environment.
- Dependency review workflow is present.
- CodeQL workflow is present.
- Security audit workflow is present.
- SECURITY.md documents disclosure, SLA, and supported versions.
- Provenance verification notes are documented in `docs/release-security.md`.