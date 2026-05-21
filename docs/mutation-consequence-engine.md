# Mutation Consequence Engine

A mutation consequence engine connects four things:

| Piece | Meaning |
| --- | --- |
| Mutation | A named data change, such as `ProductPriceChanged`. |
| Entity | The business object affected by the mutation. |
| Target | A cache, view, query, queue, tag, room, or webhook that becomes stale. |
| Adapter | The executable bridge for one tool. |

Preview mode calculates blast radius without executing adapters. Changed mode executes targets and returns a receipt. Why mode explains which mutations make a target stale.
