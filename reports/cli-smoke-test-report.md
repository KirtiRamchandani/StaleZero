# CLI Smoke Test Report

| Command | Result | First line |
| --- | --- | --- |
| stalezero init | pass | Created <temp>\stalezero.config.json |
| stalezero manifest | pass | Wrote <temp>\.stalezero\manifest.json |
| stalezero preview UserUpdated --userId=123 --teamId=456 | pass | UserUpdated previewed. |
| stalezero snapshot UserUpdated --userId=123 | pass | Snapshot: UserUpdated |
| stalezero compile | pass | Wrote <temp>\.stalezero\manifest.json |
| stalezero test-contracts | pass | ok UserUpdated |
| stalezero validate | pass | Manifest is valid |
| stalezero graph | pass | Wrote <temp>\.stalezero\graph.json |
| stalezero docs | pass | Wrote <temp>\docs\mutations.md |
| stalezero list mutations | pass | UserUpdated |
| stalezero list targets | pass | ReactQueryUser |
| stalezero why ReactQueryUser | pass | ReactQueryUser becomes stale when: |
| stalezero receipt sample | pass | { |
| stalezero replay sample --sandbox | pass | Replay: UserUpdated |
| stalezero generate product-catalog | pass | Wrote <temp>\src\stalezero\product-catalog.ts |
| stalezero devtools --once | pass | Wrote <temp>\.stalezero\devtools.html |
| stalezero doctor | pass | Node v24.11.1 |
| stalezero doctor --supply-chain | warn | Node v24.11.1 |