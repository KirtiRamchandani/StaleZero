# Proof Mode

Proof mode turns a receipt from "we called the adapter" into "we checked the effect."

```ts
const receipt = await stale.changed("UserUpdated", input, {
  prove: true,
  proofRetries: 2,
  proofTimeoutMs: 1000
});
```

Adapters can expose `verify(target, context)`:

```ts
const adapter = {
  name: "redis",
  execute: async (target) => redis.del(target.key),
  verify: async (target) => ({
    ok: (await redis.exists(target.key)) === 0,
    evidence: { key: target.key }
  })
};
```

Proof statuses:

| Status | Meaning |
| --- | --- |
| `confirmed` | The adapter verified the expected effect. |
| `failed` | Verification failed or timed out. |
| `skipped` | No verifier exists or the receipt was a dry run. |

CLI:

```bash
stalezero prove receipt.json --ci
```

In CI mode, required proof failures fail the command.

