# Maintainer Release Guide

1. Confirm npm and GitHub 2FA are enabled.
2. Run `npm run verify:rc`.
3. Run `npm run verify:clean-clone`.
4. Open the release dry-run workflow.
5. Review generated reports in `reports/`.
6. Approve the protected `npm-release` environment.
7. Run the release workflow.
8. Confirm npm provenance appears on package pages.
9. Publish the changelog and launch notes.
