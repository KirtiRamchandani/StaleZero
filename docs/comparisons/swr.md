# StaleZero vs SWR

SWR already provides `mutate()` and revalidation. StaleZero does not replace SWR.

StaleZero calls SWR as one target in a broader consequence graph. That lets a mutation revalidate SWR while also clearing Redis, notifying sockets, refreshing search, and writing a receipt.
