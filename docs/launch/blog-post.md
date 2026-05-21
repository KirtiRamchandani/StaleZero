# Blog Post Draft

## Title

Manual invalidation is dead. Long live mutation receipts.

## Opening

Every production app eventually grows a mutation that updates one database row and then touches Redis, a client cache, a Next tag, a socket room, a search queue, and a webhook. The code works until one of those calls is missed, copied into the wrong file, or silently fails.

StaleZero gives that blast radius a name.

## Demo

1. Preview `ProductPriceChanged`.
2. Show Redis, React Query, SWR, Next, WebSocket, search, and HTTP targets.
3. Run the mutation.
4. Open the receipt.
5. Filter the devtools timeline to the mutation.

## Close

StaleZero does not replace your cache or state tools. It coordinates them, records what happened, and makes stale data easier to reason about.
