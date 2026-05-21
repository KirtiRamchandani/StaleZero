# 90-Second Demo Storyboard

## 0-10 seconds

Show the product page and cart. Say: stale data bugs happen when one mutation must update five systems.

## 10-25 seconds

Open the admin price editor and change a product price.

## 25-40 seconds

Run `stalezero snapshot ProductPriceChanged --productId=p1`. Show Redis, React Query, SWR, Next, WebSocket, search, and HTTP targets.

## 40-55 seconds

Run the mutation. Show the receipt with adapter results, timing, risk, and SLO status.

## 55-70 seconds

Open Mutation Studio. Filter by `ProductPriceChanged`, click mutation, click target, then click adapter result.

## 70-82 seconds

Show the GitHub mutation diff comment. Point out added and removed blast-radius targets.

## 82-90 seconds

Close with the quickstart:

```bash
npm install stalezero
```

One mutation. Every consequence. One receipt.
