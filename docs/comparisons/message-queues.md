# StaleZero vs Message Queues

Kafka, NATS, Redis Streams, and HTTP webhooks move events. StaleZero does not replace queues.

StaleZero creates mutation events and receipts, then bus packages publish them through your chosen transport. The queue owns delivery guarantees; StaleZero owns mutation semantics, dedupe hints, loop prevention, and receipt correlation.
