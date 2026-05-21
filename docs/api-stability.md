# API Stability

| Surface | Stability |
| --- | --- |
| `createStaleZero()` | Stable |
| `changed()` | Stable |
| `preview()` | Stable |
| `receipts` | Stable |
| Memory adapter | Stable |
| Redis adapter | Beta |
| React Query adapter | Beta |
| SWR adapter | Beta |
| Next adapter | Beta/server-only |
| RTK Query adapter | Experimental |
| tRPC adapter | Experimental |
| GraphQL adapter | Experimental |
| Kafka/NATS buses | Experimental |
| Devtools | Beta |
| CLI | Beta |
| Adapter template package | Beta |

Stable APIs should not break within a major version.

Beta APIs are intended for production trials but may receive small breaking changes before 1.0 if the change improves correctness.

Experimental APIs may change without deprecation before 1.0.

## Versioning

StaleZero starts at `0.1.0` while adapter and bus contracts are hardened. The project follows semantic versioning once `1.0.0` is published.

## Deprecation

Stable APIs should receive a documented deprecation notice before removal. Experimental APIs may be renamed or removed with changelog notes.
