# Security Policy

Please report security issues privately through the repository maintainers.

Do not open a public issue for suspected credential leaks, remote execution risks, or supply-chain problems.

Supported versions:

| Version | Supported |
| --- | --- |
| 0.x | Yes |

## Response SLA

- Initial acknowledgement: 3 business days.
- Triage target: 7 business days.
- Fix target for high severity issues: 30 days, or sooner when a practical patch is available.

## Release Security

Releases use npm trusted publishing with GitHub OIDC and provenance. Maintainers should enable 2FA on npm and GitHub. Publishing rights should be limited to active maintainers and protected by the `npm-release` GitHub environment.
