# Release Dry-Run Report

| Check | Result | Notes |
| --- | --- | --- |
| npm pack all packages | pass | 36721ms |
| npm publish --workspaces --provenance --dry-run | pass | dry-run succeeded |

Trusted publishing is configured in GitHub Actions with OIDC and npm provenance. Local shells are not expected to publish.