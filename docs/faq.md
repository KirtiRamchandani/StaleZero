# FAQ

## Is StaleZero a cache?

No. StaleZero coordinates cache and state invalidation. Your data stays in the tools you already use.

## Does it replace React Query or SWR?

No. It tells those tools when a source mutation made their data stale.

## Does it require infrastructure?

No. Local mode works in one process. Distributed mode is optional.

## Can it guarantee exactly-once distributed execution?

No. It dedupes known event ids and prevents loops, but distributed systems still need idempotent handlers.
