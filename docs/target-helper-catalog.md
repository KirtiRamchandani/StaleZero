# Target Helper Catalog

StaleZero now ships a broad target-helper catalog so teams can model more production consequences without writing raw target objects.

| Group | Helpers |
| --- | --- |
| Browser and edge | `browserCacheTarget`, `cookieTarget`, `localStorageTarget`, `broadcastChannelTarget`, `serviceWorkerTarget`, `edgeConfigTarget`, `denoKvTarget`, `bunSqliteTarget` |
| CDN and framework cache | `cdnTarget`, `cdnPurgeTarget`, `cloudfrontTarget`, `fastlyTarget`, `vercelCacheTarget`, `netlifyCacheTarget`, `cloudflareCacheTarget`, `imageCacheTarget` |
| Messaging and delivery | `webhookTarget`, `queueTarget`, `topicTarget`, `streamTarget`, `emailTarget`, `smsTarget`, `pushTarget`, `analyticsTarget`, `metricsTarget`, `auditLogTarget` |
| Data and storage | `objectStorageTarget`, `s3Target`, `blobTarget`, `prismaTarget`, `drizzleTarget`, `typeormTarget`, `sequelizeTarget`, `mongoTarget`, `postgresNotifyTarget`, `outboxTarget`, `deadLetterTarget` |
| Product domains | `featureFlagTarget`, `permissionTarget`, `roleTarget`, `tenantTarget`, `billingTarget`, `stripeTarget`, `inventoryTarget`, `catalogTarget`, `cartTarget`, `checkoutTarget`, `orderTarget`, `workflowTarget`, `cronTarget`, `indexTarget`, `sessionTarget` |

Example:

```ts
await stale
  .mutate("ProductPriceChanged", { productId: "p1" })
  .target(cdnPurgeTarget("fastly", "product:p1"))
  .target(indexTarget("products", "p1"))
  .target(webhookTarget("https://worker.example.com/invalidate", {
    meta: {
      requireHttps: true,
      allowHosts: ["worker.example.com"],
      blockPrivateIps: true
    }
  }))
  .run({ consistency: "strict" });
```

These helpers are thin, typed target factories. Adapters can execute them directly, translate them into platform-native calls, or route them through a bus/outbox.
