import type { EntityRef, TargetAction, TargetRef } from "./types.js";

export function entity(type: string, id: string | number, options: Omit<EntityRef, "type" | "id"> = {}): EntityRef {
  return { type, id: String(id), ...options };
}

export function target(
  adapter: string,
  key: string,
  action: TargetAction,
  options: Omit<TargetRef, "adapter" | "key" | "action"> = {}
): TargetRef {
  return { adapter, key, action, ...options };
}

export function redisTarget(key: string, options: Omit<TargetRef<"redis">, "adapter" | "key" | "action"> = {}): TargetRef<"redis"> {
  return target("redis", key, options.meta?.action === "expire" ? "custom" : "delete", options) as TargetRef<"redis">;
}

export function redisPatternTarget(
  pattern: string,
  options: Omit<TargetRef<"redis">, "adapter" | "key" | "action"> = {}
): TargetRef<"redis"> {
  return target("redis", pattern, "delete", { ...options, meta: { ...options.meta, pattern: true } }) as TargetRef<"redis">;
}

export function reduxTarget(path: string, options: Omit<TargetRef<"redux">, "adapter" | "key" | "action"> = {}): TargetRef<"redux"> {
  return target("redux", path, options.meta?.patch ? "patch" : "invalidate", options) as TargetRef<"redux">;
}

export function queryTarget(
  queryKey: unknown[],
  options: Omit<TargetRef<"query">, "adapter" | "key" | "action"> = {}
): TargetRef<"query"> {
  return target("query", JSON.stringify(queryKey), (options.meta?.action as TargetAction) ?? "invalidate", {
    ...options,
    meta: { ...options.meta, queryKey }
  }) as TargetRef<"query">;
}

export function swrTarget(key: string, options: Omit<TargetRef<"swr">, "adapter" | "key" | "action"> = {}): TargetRef<"swr"> {
  return target("swr", key, (options.meta?.action as TargetAction) ?? "revalidate", options) as TargetRef<"swr">;
}

export function zustandTarget(path: string, options: Omit<TargetRef<"zustand">, "adapter" | "key" | "action"> = {}): TargetRef<"zustand"> {
  return target("zustand", path, (options.meta?.action as TargetAction) ?? "patch", options) as TargetRef<"zustand">;
}

export function nextTagTarget(tag: string, options: Omit<TargetRef<"next">, "adapter" | "key" | "action"> = {}): TargetRef<"next"> {
  return target("next", tag, "revalidate", { ...options, meta: { ...options.meta, kind: "tag" } }) as TargetRef<"next">;
}

export function nextPathTarget(path: string, options: Omit<TargetRef<"next">, "adapter" | "key" | "action"> = {}): TargetRef<"next"> {
  return target("next", path, "revalidate", { ...options, meta: { ...options.meta, kind: "path" } }) as TargetRef<"next">;
}

export function apolloTarget(
  options: Omit<TargetRef<"apollo">, "adapter" | "key" | "action"> & { id?: string; typeName?: string; queryName?: string }
): TargetRef<"apollo"> {
  const key = options.id ?? options.queryName ?? options.typeName ?? "apollo";
  return target("apollo", key, (options.meta?.action as TargetAction) ?? "invalidate", {
    ...options,
    meta: { ...options.meta, id: options.id, typeName: options.typeName, queryName: options.queryName }
  }) as TargetRef<"apollo">;
}

export function socketTarget(
  room: string,
  options: Omit<TargetRef<"socket">, "adapter" | "key" | "action"> & { event?: string } = {}
): TargetRef<"socket"> {
  return target("socket", room, "notify", { ...options, meta: { ...options.meta, event: options.event ?? "stalezero.changed" } }) as TargetRef<"socket">;
}

export function searchTarget(
  index: string,
  id: string,
  options: Omit<TargetRef<"search">, "adapter" | "key" | "action"> = {}
): TargetRef<"search"> {
  return target("search", `${index}:${id}`, (options.meta?.action as TargetAction) ?? "enqueue", {
    ...options,
    meta: { ...options.meta, index, id }
  }) as TargetRef<"search">;
}

export function httpTarget(
  url: string,
  options: Omit<TargetRef<"http">, "adapter" | "key" | "action"> = {}
): TargetRef<"http"> {
  return target("http", url, "publish", options) as TargetRef<"http">;
}

export function jobTarget(
  queue: string,
  payload: unknown,
  options: Omit<TargetRef<"job">, "adapter" | "key" | "action"> = {}
): TargetRef<"job"> {
  return target("job", queue, "enqueue", { ...options, meta: { ...options.meta, payload } }) as TargetRef<"job">;
}

export function customTarget(
  adapter: string,
  key: string,
  options: Omit<TargetRef, "adapter" | "key" | "action"> & { action?: TargetAction } = {}
): TargetRef {
  return target(adapter, key, options.action ?? "custom", options);
}

export function browserCacheTarget(key: string, options: Omit<TargetRef<"browser-cache">, "adapter" | "key" | "action"> = {}): TargetRef<"browser-cache"> {
  return target("browser-cache", key, "delete", options) as TargetRef<"browser-cache">;
}

export function cdnTarget(provider: string, key: string, options: Omit<TargetRef<"cdn">, "adapter" | "key" | "action"> = {}): TargetRef<"cdn"> {
  return target("cdn", `${provider}:${key}`, "purge" as TargetAction, { ...options, meta: { ...options.meta, provider, key } }) as TargetRef<"cdn">;
}

export function cdnPurgeTarget(provider: string, key: string, options: Omit<TargetRef<"cdn">, "adapter" | "key" | "action"> = {}): TargetRef<"cdn"> {
  return cdnTarget(provider, key, options);
}

export function cloudfrontTarget(
  distributionId: string,
  path: string,
  options: Omit<TargetRef<"cloudfront">, "adapter" | "key" | "action"> = {}
): TargetRef<"cloudfront"> {
  return target("cloudfront", `${distributionId}:${path}`, "delete", {
    ...options,
    meta: { ...options.meta, distributionId, path }
  }) as TargetRef<"cloudfront">;
}

export function fastlyTarget(serviceId: string, key: string, options: Omit<TargetRef<"fastly">, "adapter" | "key" | "action"> = {}): TargetRef<"fastly"> {
  return target("fastly", `${serviceId}:${key}`, "delete", { ...options, meta: { ...options.meta, serviceId, key } }) as TargetRef<"fastly">;
}

export function vercelCacheTarget(
  key: string,
  options: Omit<TargetRef<"vercel-cache">, "adapter" | "key" | "action"> & { kind?: "tag" | "path" } = {}
): TargetRef<"vercel-cache"> {
  return target("vercel-cache", key, "revalidate", { ...options, meta: { ...options.meta, kind: options.kind ?? "tag" } }) as TargetRef<"vercel-cache">;
}

export function netlifyCacheTarget(key: string, options: Omit<TargetRef<"netlify-cache">, "adapter" | "key" | "action"> = {}): TargetRef<"netlify-cache"> {
  return target("netlify-cache", key, "delete", options) as TargetRef<"netlify-cache">;
}

export function cloudflareCacheTarget(
  zone: string,
  key: string,
  options: Omit<TargetRef<"cloudflare-cache">, "adapter" | "key" | "action"> = {}
): TargetRef<"cloudflare-cache"> {
  return target("cloudflare-cache", `${zone}:${key}`, "delete", { ...options, meta: { ...options.meta, zone, key } }) as TargetRef<"cloudflare-cache">;
}

export function edgeConfigTarget(key: string, options: Omit<TargetRef<"edge-config">, "adapter" | "key" | "action"> = {}): TargetRef<"edge-config"> {
  return target("edge-config", key, "invalidate", options) as TargetRef<"edge-config">;
}

export function imageCacheTarget(src: string, options: Omit<TargetRef<"image-cache">, "adapter" | "key" | "action"> = {}): TargetRef<"image-cache"> {
  return target("image-cache", src, "delete", options) as TargetRef<"image-cache">;
}

export function sessionTarget(sessionId: string, options: Omit<TargetRef<"session">, "adapter" | "key" | "action"> = {}): TargetRef<"session"> {
  return target("session", sessionId, "remove", options) as TargetRef<"session">;
}

export function cookieTarget(name: string, options: Omit<TargetRef<"cookie">, "adapter" | "key" | "action"> = {}): TargetRef<"cookie"> {
  return target("cookie", name, "remove", options) as TargetRef<"cookie">;
}

export function localStorageTarget(key: string, options: Omit<TargetRef<"local-storage">, "adapter" | "key" | "action"> = {}): TargetRef<"local-storage"> {
  return target("local-storage", key, "remove", options) as TargetRef<"local-storage">;
}

export function broadcastChannelTarget(channel: string, options: Omit<TargetRef<"broadcast-channel">, "adapter" | "key" | "action"> = {}): TargetRef<"broadcast-channel"> {
  return target("broadcast-channel", channel, "notify", options) as TargetRef<"broadcast-channel">;
}

export function serviceWorkerTarget(scope: string, options: Omit<TargetRef<"service-worker">, "adapter" | "key" | "action"> = {}): TargetRef<"service-worker"> {
  return target("service-worker", scope, "notify", options) as TargetRef<"service-worker">;
}

export function analyticsTarget(event: string, options: Omit<TargetRef<"analytics">, "adapter" | "key" | "action"> = {}): TargetRef<"analytics"> {
  return target("analytics", event, "publish", options) as TargetRef<"analytics">;
}

export function metricsTarget(metric: string, options: Omit<TargetRef<"metrics">, "adapter" | "key" | "action"> = {}): TargetRef<"metrics"> {
  return target("metrics", metric, "publish", options) as TargetRef<"metrics">;
}

export function auditLogTarget(stream: string, options: Omit<TargetRef<"audit-log">, "adapter" | "key" | "action"> = {}): TargetRef<"audit-log"> {
  return target("audit-log", stream, "publish", options) as TargetRef<"audit-log">;
}

export function emailTarget(
  template: string,
  recipient: string,
  options: Omit<TargetRef<"email">, "adapter" | "key" | "action"> = {}
): TargetRef<"email"> {
  return target("email", `${template}:${recipient}`, "enqueue", { ...options, meta: { ...options.meta, template, recipient } }) as TargetRef<"email">;
}

export function smsTarget(template: string, recipient: string, options: Omit<TargetRef<"sms">, "adapter" | "key" | "action"> = {}): TargetRef<"sms"> {
  return target("sms", `${template}:${recipient}`, "enqueue", { ...options, meta: { ...options.meta, template, recipient } }) as TargetRef<"sms">;
}

export function pushTarget(topic: string, options: Omit<TargetRef<"push">, "adapter" | "key" | "action"> = {}): TargetRef<"push"> {
  return target("push", topic, "notify", options) as TargetRef<"push">;
}

export function webhookTarget(url: string, options: Parameters<typeof httpTarget>[1] = {}): TargetRef<"http"> {
  return httpTarget(url, { ...options, meta: { ...options.meta, kind: "webhook" } });
}

export function queueTarget(queue: string, payload: unknown, options: Parameters<typeof jobTarget>[2] = {}): TargetRef<"job"> {
  return jobTarget(queue, payload, options);
}

export function topicTarget(topic: string, payload?: unknown, options: Omit<TargetRef<"topic">, "adapter" | "key" | "action"> = {}): TargetRef<"topic"> {
  return target("topic", topic, "publish", { ...options, meta: { ...options.meta, payload } }) as TargetRef<"topic">;
}

export function streamTarget(stream: string, id = "*", options: Omit<TargetRef<"stream">, "adapter" | "key" | "action"> = {}): TargetRef<"stream"> {
  return target("stream", `${stream}:${id}`, "publish", { ...options, meta: { ...options.meta, stream, id } }) as TargetRef<"stream">;
}

export function indexTarget(index: string, id: string, options: Parameters<typeof searchTarget>[2] = {}): TargetRef<"search"> {
  return searchTarget(index, id, options);
}

export function objectStorageTarget(
  bucket: string,
  key: string,
  options: Omit<TargetRef<"object-storage">, "adapter" | "key" | "action"> = {}
): TargetRef<"object-storage"> {
  return target("object-storage", `${bucket}:${key}`, "delete", { ...options, meta: { ...options.meta, bucket, key } }) as TargetRef<"object-storage">;
}

export function s3Target(bucket: string, key: string, options: Omit<TargetRef<"s3">, "adapter" | "key" | "action"> = {}): TargetRef<"s3"> {
  return target("s3", `${bucket}:${key}`, "delete", { ...options, meta: { ...options.meta, bucket, key } }) as TargetRef<"s3">;
}

export function blobTarget(container: string, key: string, options: Omit<TargetRef<"blob">, "adapter" | "key" | "action"> = {}): TargetRef<"blob"> {
  return target("blob", `${container}:${key}`, "delete", { ...options, meta: { ...options.meta, container, key } }) as TargetRef<"blob">;
}

export function prismaTarget(model: string, id: string, options: Omit<TargetRef<"prisma">, "adapter" | "key" | "action"> = {}): TargetRef<"prisma"> {
  return target("prisma", `${model}:${id}`, "publish", { ...options, meta: { ...options.meta, model, id } }) as TargetRef<"prisma">;
}

export function drizzleTarget(table: string, id: string, options: Omit<TargetRef<"drizzle">, "adapter" | "key" | "action"> = {}): TargetRef<"drizzle"> {
  return target("drizzle", `${table}:${id}`, "publish", { ...options, meta: { ...options.meta, table, id } }) as TargetRef<"drizzle">;
}

export function typeormTarget(entityName: string, id: string, options: Omit<TargetRef<"typeorm">, "adapter" | "key" | "action"> = {}): TargetRef<"typeorm"> {
  return target("typeorm", `${entityName}:${id}`, "publish", { ...options, meta: { ...options.meta, entityName, id } }) as TargetRef<"typeorm">;
}

export function sequelizeTarget(model: string, id: string, options: Omit<TargetRef<"sequelize">, "adapter" | "key" | "action"> = {}): TargetRef<"sequelize"> {
  return target("sequelize", `${model}:${id}`, "publish", { ...options, meta: { ...options.meta, model, id } }) as TargetRef<"sequelize">;
}

export function mongoTarget(collection: string, id: string, options: Omit<TargetRef<"mongo">, "adapter" | "key" | "action"> = {}): TargetRef<"mongo"> {
  return target("mongo", `${collection}:${id}`, "publish", { ...options, meta: { ...options.meta, collection, id } }) as TargetRef<"mongo">;
}

export function postgresNotifyTarget(
  channel: string,
  payload?: unknown,
  options: Omit<TargetRef<"postgres-notify">, "adapter" | "key" | "action"> = {}
): TargetRef<"postgres-notify"> {
  return target("postgres-notify", channel, "publish", { ...options, meta: { ...options.meta, payload } }) as TargetRef<"postgres-notify">;
}

export function outboxTarget(table: string, id: string, options: Omit<TargetRef<"outbox">, "adapter" | "key" | "action"> = {}): TargetRef<"outbox"> {
  return target("outbox", `${table}:${id}`, "enqueue", { ...options, meta: { ...options.meta, table, id } }) as TargetRef<"outbox">;
}

export function deadLetterTarget(queue: string, id: string, options: Omit<TargetRef<"dead-letter">, "adapter" | "key" | "action"> = {}): TargetRef<"dead-letter"> {
  return target("dead-letter", `${queue}:${id}`, "enqueue", { ...options, meta: { ...options.meta, queue, id } }) as TargetRef<"dead-letter">;
}

export function featureFlagTarget(flag: string, options: Omit<TargetRef<"feature-flag">, "adapter" | "key" | "action"> = {}): TargetRef<"feature-flag"> {
  return target("feature-flag", flag, "invalidate", options) as TargetRef<"feature-flag">;
}

export function permissionTarget(subject: string, options: Omit<TargetRef<"permission">, "adapter" | "key" | "action"> = {}): TargetRef<"permission"> {
  return target("permission", subject, "invalidate", options) as TargetRef<"permission">;
}

export function roleTarget(role: string, options: Omit<TargetRef<"role">, "adapter" | "key" | "action"> = {}): TargetRef<"role"> {
  return target("role", role, "invalidate", options) as TargetRef<"role">;
}

export function tenantTarget(tenantId: string, options: Omit<TargetRef<"tenant">, "adapter" | "key" | "action"> = {}): TargetRef<"tenant"> {
  return target("tenant", tenantId, "invalidate", options) as TargetRef<"tenant">;
}

export function billingTarget(accountId: string, options: Omit<TargetRef<"billing">, "adapter" | "key" | "action"> = {}): TargetRef<"billing"> {
  return target("billing", accountId, "invalidate", options) as TargetRef<"billing">;
}

export function stripeTarget(object: string, id: string, options: Omit<TargetRef<"stripe">, "adapter" | "key" | "action"> = {}): TargetRef<"stripe"> {
  return target("stripe", `${object}:${id}`, "publish", { ...options, meta: { ...options.meta, object, id } }) as TargetRef<"stripe">;
}

export function inventoryTarget(sku: string, options: Omit<TargetRef<"inventory">, "adapter" | "key" | "action"> = {}): TargetRef<"inventory"> {
  return target("inventory", sku, "invalidate", options) as TargetRef<"inventory">;
}

export function catalogTarget(productId: string, options: Omit<TargetRef<"catalog">, "adapter" | "key" | "action"> = {}): TargetRef<"catalog"> {
  return target("catalog", productId, "invalidate", options) as TargetRef<"catalog">;
}

export function cartTarget(cartId: string, options: Omit<TargetRef<"cart">, "adapter" | "key" | "action"> = {}): TargetRef<"cart"> {
  return target("cart", cartId, "invalidate", options) as TargetRef<"cart">;
}

export function checkoutTarget(sessionId: string, options: Omit<TargetRef<"checkout">, "adapter" | "key" | "action"> = {}): TargetRef<"checkout"> {
  return target("checkout", sessionId, "invalidate", options) as TargetRef<"checkout">;
}

export function orderTarget(orderId: string, options: Omit<TargetRef<"order">, "adapter" | "key" | "action"> = {}): TargetRef<"order"> {
  return target("order", orderId, "invalidate", options) as TargetRef<"order">;
}

export function workflowTarget(name: string, id: string, options: Omit<TargetRef<"workflow">, "adapter" | "key" | "action"> = {}): TargetRef<"workflow"> {
  return target("workflow", `${name}:${id}`, "enqueue", { ...options, meta: { ...options.meta, name, id } }) as TargetRef<"workflow">;
}

export function cronTarget(name: string, options: Omit<TargetRef<"cron">, "adapter" | "key" | "action"> = {}): TargetRef<"cron"> {
  return target("cron", name, "enqueue", options) as TargetRef<"cron">;
}

export function denoKvTarget(key: string, options: Omit<TargetRef<"deno-kv">, "adapter" | "key" | "action"> = {}): TargetRef<"deno-kv"> {
  return target("deno-kv", key, "delete", options) as TargetRef<"deno-kv">;
}

export function bunSqliteTarget(table: string, id: string, options: Omit<TargetRef<"bun-sqlite">, "adapter" | "key" | "action"> = {}): TargetRef<"bun-sqlite"> {
  return target("bun-sqlite", `${table}:${id}`, "invalidate", { ...options, meta: { ...options.meta, table, id } }) as TargetRef<"bun-sqlite">;
}
