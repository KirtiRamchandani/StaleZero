# Manual Invalidation Is Dead

Manual invalidation does not fail because engineers forget caches. It fails because modern apps have too many places where a single mutation has consequences.

The answer is not another cache. Redis, TanStack Query, SWR, Redux, Next cache APIs, sockets, and search queues already do their own jobs well. The missing layer is the one that says: when this mutation happens, these are the systems that must hear about it, in this order, with this receipt.

StaleZero is that layer. It keeps mutation consequences explicit, previewable, testable, and observable.
