# StaleZero vs React Query

TanStack Query already has excellent query invalidation. StaleZero does not replace it.

StaleZero coordinates React Query with the other systems that also need to react: Redis keys, SWR endpoints, Redux or Zustand state, Next cache tags, sockets, search indexes, and webhooks. Use React Query for client data fetching. Use StaleZero when a backend mutation has a cross-system blast radius.
