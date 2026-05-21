# CLI Smoke Test Report

| Command | Result | First line |
| --- | --- | --- |
| stalezero init | pass | Created C:\Users\kirti\AppData\Local\Temp\stalezero-cli-1779331922267\stalezero.config.json |
| stalezero manifest | pass | Wrote C:\Users\kirti\AppData\Local\Temp\stalezero-cli-1779331922267\.stalezero\manifest.json |
| stalezero preview UserUpdated --userId=123 --teamId=456 | pass | UserUpdated previewed. |
| stalezero snapshot UserUpdated --userId=123 | pass | Snapshot: UserUpdated |
| stalezero compile | pass | Wrote C:\Users\kirti\AppData\Local\Temp\stalezero-cli-1779331922267\.stalezero\manifest.json |
| stalezero test-contracts | pass | ok UserUpdated |
| stalezero validate | pass | Manifest is valid |
| stalezero graph | pass | Wrote C:\Users\kirti\AppData\Local\Temp\stalezero-cli-1779331922267\.stalezero\graph.json |
| stalezero docs | pass | Wrote C:\Users\kirti\AppData\Local\Temp\stalezero-cli-1779331922267\docs\mutations.md |
| stalezero list mutations | pass | UserUpdated |
| stalezero list targets | pass | ReactQueryUser |
| stalezero why ReactQueryUser | pass | ReactQueryUser becomes stale when: |
| stalezero receipt sample | pass | { |
| stalezero replay sample --sandbox | pass | Replay: UserUpdated |
| stalezero generate product-catalog | pass | Wrote C:\Users\kirti\AppData\Local\Temp\stalezero-cli-1779331922267\src\stalezero\product-catalog.ts |
| stalezero devtools --once | pass | Wrote C:\Users\kirti\AppData\Local\Temp\stalezero-cli-1779331922267\.stalezero\devtools.html |
| stalezero doctor | pass | Node v24.11.1 |
| stalezero doctor --supply-chain | warn | Node v24.11.1 |