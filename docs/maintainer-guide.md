# Maintainer Guide

## Weekly

- Review security advisories and dependency review alerts.
- Keep issue templates tidy.
- Label good first issues.
- Check adapter requests for overlap with existing targets.

## Before release

- Run `npm run verify:rc`.
- Run `npm run verify:clean-clone`.
- Run `npm run release:dry-run`.
- Confirm `reports/npm-pack-verification.md`.
- Confirm `reports/security-hardening.md`.
- Confirm `CHANGELOG.md`.

## Release

Use the protected `npm-release` environment and trusted publishing workflow. Do not add long-lived npm publish tokens to repository secrets.
