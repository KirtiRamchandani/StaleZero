import {
  createStaleZero,
  entity,
  memoryAdapter,
  memoryBus,
  memoryTarget,
  redisTarget,
  queryTarget,
  swrTarget,
  nextTagTarget,
  websocketAdapter,
  searchAdapter,
  httpWebhookBus,
  httpAdapter,
  trpcAdapter,
  trpcTarget,
  graphqlAdapter,
  graphqlEntityTarget,
  cloudflareKvAdapter,
  kvTarget,
  kafkaBus,
  redisStreamBus,
  insertOutboxEvent,
  fetchPendingOutboxEvents,
  replayOutbox
} from "../packages/stalezero/dist/index.js";
import { run, writeReport, markdownTable } from "./lib.mjs";

await run("npm", ["run", "build"]);

const rows = [];
const only = new Set(
  process.argv
    .filter((arg) => arg.startsWith("--only="))
    .flatMap((arg) => arg.slice("--only=".length).split(",").map((value) => value.trim()).filter(Boolean))
);

async function example(name, fn) {
  if (only.size > 0 && !only.has(name)) {
    return;
  }
  try {
    const output = await fn();
    rows.push([name, "pass", output ?? "ok"]);
  } catch (error) {
    rows.push([name, "fail", error instanceof Error ? error.message : String(error)]);
  }
}

await example("minimal-node", async () => {
  const adapter = memoryAdapter();
  const receipt = await createStaleZero().use(adapter).mutate("Minimal", {}).target(memoryTarget("minimal:1")).run();
  return receipt.status;
});

await example("memory-adapter", async () => {
  const adapter = memoryAdapter();
  await createStaleZero().use(adapter).mutate("Memory", {}).target(memoryTarget("memory:1")).run();
  return `${adapter.calls.length} call`;
});

await example("redis-fake-query", async () => {
  const keys = [];
  const stale = createStaleZero();
  stale.use({ name: "redis", execute: (target) => keys.push(target.key) });
  stale.use({ name: "query", execute: (target) => keys.push(target.key) });
  await stale.mutate("UserUpdated", { userId: "123" }).redis("user:123").query(["user", "123"]).run();
  return keys.join(",");
});

await example("next-react-query-redis", async () => {
  const targets = [];
  const stale = createStaleZero();
  for (const name of ["redis", "query", "next"]) stale.use({ name, execute: (target) => targets.push(`${target.adapter}:${target.key}`) });
  await stale.mutate("UserUpdated", {}).target(redisTarget("user:123")).target(queryTarget(["user", "123"])).target(nextTagTarget("user:123")).run();
  return `${targets.length} targets`;
});

await example("swr", async () => {
  const calls = [];
  const stale = createStaleZero().use({ name: "swr", execute: (target) => calls.push(target.key) });
  await stale.mutate("UserUpdated", {}).target(swrTarget("/api/users/123")).run();
  return calls[0];
});

await example("redux-toolkit", async () => {
  const actions = [];
  const stale = createStaleZero().use({ name: "redux", execute: (target) => actions.push(target.key) });
  await stale.mutate("Redux", {}).redux("users.byId.123").run();
  return actions[0];
});

await example("zustand", async () => {
  const state = { users: {} };
  const stale = createStaleZero().use({ name: "zustand", execute: (target) => (state.users[target.key] = "stale") });
  await stale.mutate("Zustand", {}).zustand("123").run();
  return state.users["123"];
});

await example("websocket-notification", async () => {
  const emitted = [];
  const stale = createStaleZero().use(websocketAdapter({ emit: (room, event) => emitted.push(`${room}:${event}`) }));
  await stale.mutate("ProductPriceChanged", {}).socket("product:123", "product.price.changed").run();
  return emitted[0];
});

await example("search-reindex", async () => {
  const jobs = [];
  const stale = createStaleZero().use(searchAdapter({ handler: (job) => jobs.push(job.index) }));
  await stale.mutate("Search", {}).search("products", "p1").run();
  return jobs[0];
});

await example("http-webhook-bus", async () => {
  const bus = memoryBus();
  const stale = createStaleZero({ distributed: { enabled: true, ignoreSelf: false } }).useBus(bus);
  await stale.changed("WebhookEvent", {});
  return `${bus.events.length} event`;
});

await example("ecommerce-demo", async () => {
  const calls = [];
  const stale = createStaleZero();
  stale.use({ name: "memory", execute: (target) => calls.push(target.key) });
  stale.mutation("ProductPriceChanged", {
    affects: ({ productId }) => [entity("Product", productId)]
  });
  stale.mirror("ProductCache", { when: "ProductPriceChanged", target: ({ productId }) => memoryTarget(`product:${productId}`) });
  const receipt = await stale.changed("ProductPriceChanged", { productId: "p1" });
  return `${receipt.status}:${calls[0]}`;
});

await example("distributed-redis-pubsub", async () => {
  const bus = memoryBus("redis-pubsub-fake");
  await createStaleZero({ distributed: { enabled: true, ignoreSelf: false } }).useBus(bus).changed("Distributed", {});
  return bus.events[0].mutation;
});

await example("redis-streams", async () => {
  const messages = [];
  let read = false;
  const bus = redisStreamBus({
    stream: "events",
    pollIntervalMs: 1,
    blockMs: 1,
    client: {
      xAdd: (_stream, _id, fields) => {
        messages.push(fields);
      },
      xRead: () => {
        if (read || messages.length === 0) {
          return null;
        }
        read = true;
        return [{ name: "events", messages: [{ id: "1-0", message: messages[0] }] }];
      }
    }
  });
  const seen = [];
  await bus.publish({ id: "event-1", mutation: "RedisStreamEvent", input: {}, affected: [], timestamp: Date.now(), hops: 0 });
  const stop = await bus.subscribe((event) => seen.push(event.mutation));
  await new Promise((resolve) => setTimeout(resolve, 5));
  await stop();
  return seen[0];
});

await example("postgres-outbox", async () => {
  const rows = [];
  const client = {
    query: (sql, params = []) => {
      if (sql.includes("INSERT INTO stalezero_outbox")) {
        rows.push({ id: params[0], app: params[1], mutation: params[2], payload: JSON.parse(params[3]), affected: JSON.parse(params[4]), created_at: new Date().toISOString() });
      }
      if (sql.includes("SELECT id")) {
        return { rows };
      }
      if (sql.includes("UPDATE stalezero_outbox SET status = 'processed'")) {
        rows.shift();
      }
      return { rows };
    }
  };
  const event = { id: "event-1", app: "api", mutation: "OutboxEvent", input: { id: "1" }, affected: [], timestamp: Date.now(), hops: 0 };
  await insertOutboxEvent(client, event);
  const pending = await fetchPendingOutboxEvents(client);
  await replayOutbox(client, () => undefined);
  return `${pending.length} pending`;
});

await example("kafka-event-bus", async () => {
  const messages = [];
  let callback;
  const bus = kafkaBus({
    producer: { send: ({ messages: next }) => messages.push(...next) },
    consumer: {
      subscribe: () => undefined,
      run: ({ eachMessage }) => {
        callback = eachMessage;
      },
      stop: () => undefined
    }
  });
  const seen = [];
  await bus.subscribe((event) => seen.push(event.mutation));
  await bus.publish({ id: "event-1", mutation: "KafkaEvent", input: {}, affected: [], timestamp: Date.now(), hops: 0 });
  await callback({ message: { value: messages[0].value } });
  return seen[0];
});

await example("cloudflare-worker-kv", async () => {
  const deleted = [];
  const stale = createStaleZero().use(cloudflareKvAdapter({ namespace: { delete: async (key) => deleted.push(key) } }));
  await stale.mutate("KvDelete", {}).target(kvTarget("user:123")).run();
  return deleted[0];
});

await example("serverless-function", async () => {
  const calls = [];
  const stale = createStaleZero().use(httpAdapter({ fetch: async (url) => { calls.push(String(url)); return new Response("ok"); } }));
  await stale.mutate("ServerlessHook", {}).http("https://example.test/serverless").run();
  return calls[0];
});

await example("trpc-mutation", async () => {
  let invalidated = "";
  const stale = createStaleZero().use(trpcAdapter({ utils: { user: { byId: { invalidate: () => { invalidated = "user.byId"; } } } } }));
  await stale.mutate("TrpcMutation", {}).target(trpcTarget("user.byId")).run();
  return invalidated;
});

await example("graphql-mutation", async () => {
  const invalidated = [];
  const stale = createStaleZero().use(graphqlAdapter({ cache: { invalidate: (target) => invalidated.push(target.key) } }));
  await stale.mutate("GraphqlMutation", {}).target(graphqlEntityTarget("User", "123")).run();
  return invalidated[0];
});

await example("prisma-middleware", async () => {
  const adapter = memoryAdapter();
  const stale = createStaleZero().use(adapter);
  async function prismaMiddleware(params, next) {
    const result = await next(params);
    if (params.action === "update") {
      await stale.mutate("PrismaUserUpdated", params.args).target(memoryTarget(`user:${params.args.where.id}`)).run();
    }
    return result;
  }
  await prismaMiddleware({ model: "User", action: "update", args: { where: { id: "123" } } }, async () => ({ id: "123" }));
  return adapter.calls[0].target.key;
});

await example("drizzle-helper", async () => {
  const adapter = memoryAdapter();
  const stale = createStaleZero().use(adapter);
  async function withDrizzleChange(operation, mutation, input) {
    const output = await operation();
    await stale.mutate(mutation, input).target(memoryTarget(`order:${input.orderId}`)).run();
    return output;
  }
  await withDrizzleChange(async () => ({ changed: true }), "DrizzleOrderUpdated", { orderId: "o1" });
  return adapter.calls[0].target.key;
});

await example("supabase-firebase-source-events", async () => {
  const bus = memoryBus({ name: "app-events", dedupeTtlMs: 1000 });
  await bus.publish({ id: "event-1", mutation: "RealtimeSourceChanged", input: { table: "users" }, affected: [], timestamp: Date.now(), hops: 0 });
  return bus.events[0].mutation;
});

await example("vercel-edge-cache", async () => {
  const targets = [];
  await createStaleZero().use({ name: "next", execute: (target) => targets.push(target.key) }).mutate("EdgeRevalidated", {}).nextTag("product:edge").run();
  return targets[0];
});

const failures = rows.filter((row) => row[1] !== "pass");
await writeReport("examples-run-report", ["# Examples Run Report", "", markdownTable(["Example", "Result", "Output"], rows)].join("\n"), rows);
if (rows.length === 0) {
  throw new Error(`No examples matched: ${[...only].join(", ")}`);
}
if (failures.length > 0) {
  throw new Error(`Examples failed: ${failures.map((row) => row[0]).join(", ")}`);
}
