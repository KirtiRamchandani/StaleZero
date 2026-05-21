# Concepts

StaleZero has five primitives.

| Primitive | Meaning |
| --- | --- |
| Entity | Source identity such as `User:123` |
| Mutation | Named source change such as `UserUpdated` |
| Target | Cache, view, queue, or client that must react |
| Adapter | Small function that knows how to execute a target |
| Receipt | Durable report of what happened |

The engine does not keep a copy of your app data. It keeps the relationship between source changes and consequences.

## Local Mode

Local mode runs adapters in the current process. It works well for monoliths, route handlers, server actions, and tests.

## Distributed Mode

Distributed mode publishes mutation events to a bus. Other processes receive the event and run the adapters they own. Event ids, hop counts, and self-ignore rules prevent loops.
