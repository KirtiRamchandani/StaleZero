# Hacker News Launch Text

Show HN: StaleZero, a mutation consequence engine for cache invalidation

I built StaleZero because cache invalidation in modern apps is no longer one cache. A single mutation may need to clear Redis, invalidate React Query, revalidate SWR, touch Redux or Zustand, revalidate Next tags, notify sockets, and enqueue search reindexing.

StaleZero lets you declare that blast radius once, preview it, run it, and get a receipt showing what executed and what failed.

It is not a replacement for TanStack Query, SWR, Redux, Next cache APIs, Redis, or queues. It coordinates them.
