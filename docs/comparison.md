# Comparison

## React Query

React Query manages server-state cache in the client. StaleZero decides when a mutation elsewhere should call React Query invalidation.

## SWR

SWR provides `mutate()` and revalidation. StaleZero coordinates when to call it alongside other systems.

## Redux

Redux stores client state. StaleZero can dispatch invalidation or patch actions after source mutations.

## Next.js Cache

Next.js provides `revalidateTag()` and `revalidatePath()`. StaleZero calls them as one consequence in a wider blast radius.

## Queues

Queues transport events. StaleZero maps mutation events to concrete stale-state consequences.
