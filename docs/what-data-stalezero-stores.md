# What Data StaleZero Stores

By default, StaleZero stores receipts in memory. A receipt includes:

- mutation name
- redacted input
- affected entities
- target keys and adapter names
- adapter result status and timing
- error messages when adapters fail

StaleZero does not store your database rows, cache values, secrets, or client state. Use receipt redaction for sensitive payload fields.
