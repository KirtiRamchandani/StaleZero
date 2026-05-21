# Release Dry-Run Report

| Check | Result | Notes |
| --- | --- | --- |
| npm pack all packages | pass | 48216ms |
| npm publish --workspaces --provenance --dry-run | pass | dry-run succeeded |

Trusted publishing is configured in GitHub Actions with OIDC and npm provenance. Local shells are not expected to publish.