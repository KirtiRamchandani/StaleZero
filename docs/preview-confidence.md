# Preview Confidence

Preview is a promise about what StaleZero can know before execution. The confidence field tells reviewers how much to trust the target list.

| Confidence | Meaning |
| --- | --- |
| `exact` | A deterministic target such as `redis:user:123` or `["user","123"]`. |
| `estimated` | An external target where final effect depends on another system, such as search, sockets, jobs, or HTTP. |
| `unsafe` | A broad target such as a wildcard purge or pattern delete. Requires sandbox or approval in production. |
| `unknown` | Manifest-only target without runtime target detail. |

World-class previews should say:

- exact cache keys
- estimated external targets
- wildcard or broad targets
- required and optional targets
- risk reasons
- approval requirements

`preview.toJSON()` exposes both the overall `confidence` and per-target `targetConfidence`.

