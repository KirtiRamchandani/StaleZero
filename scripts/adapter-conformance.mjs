import {
  apolloAdapter,
  cloudflareKvAdapter,
  createStaleZero,
  graphqlAdapter,
  httpAdapter,
  memoryAdapter,
  memoryTarget,
  nextCacheAdapter,
  reactQueryAdapter,
  redisAdapter,
  reduxAdapter,
  rtkQueryAdapter,
  searchAdapter,
  swrAdapter,
  trpcAdapter,
  websocketAdapter,
  zustandAdapter,
  target
} from "../packages/stalezero/dist/index.js";
import { writeReport, markdownTable, run } from "./lib.mjs";

await run("npm", ["run", "build"]);

const rows = [];

async function check(name, adapter, validTarget) {
  const stale = createStaleZero().use(adapter);
  const strict = createStaleZero().use({
    name: adapter.name,
    execute: () => {
      throw new Error("forced failure");
    }
  });

  let valid = "fail";
  let bestEffort = "fail";
  let strictFailure = "fail";
  let missing = "fail";

  try {
    const receipt = await stale.mutate("AdapterContract", { secret: "hidden" }).target(validTarget).run();
    valid = receipt.status === "success" ? "pass" : "fail";
  } catch {
    valid = "fail";
  }

  try {
    const receipt = await strict.mutate("AdapterContract", {}).target(validTarget).run({ consistency: "best-effort" });
    bestEffort = receipt.hasFailures() ? "pass" : "fail";
  } catch {
    bestEffort = "fail";
  }

  try {
    await strict.mutate("AdapterContract", {}).target(validTarget).run({ consistency: "strict" });
  } catch {
    strictFailure = "pass";
  }

  try {
    const missingReceipt = await createStaleZero().mutate("MissingAdapter", {}).target(validTarget).run();
    missing = missingReceipt.hasFailures() ? "pass" : "fail";
  } catch {
    missing = "fail";
  }

  rows.push([name, valid, bestEffort, strictFailure, missing]);
}

await check("memory", memoryAdapter(), memoryTarget("memory:1"));
await check("redis", redisAdapter({ del: () => undefined, scanIterator: async function* () { yield "user:1"; } }), target("redis", "user:1", "delete"));
await check("redux", reduxAdapter({ dispatch: () => undefined }), target("redux", "users.byId.1", "invalidate"));
await check("react-query", reactQueryAdapter({ invalidateQueries: () => undefined }), target("query", JSON.stringify(["user", "1"]), "invalidate", { meta: { queryKey: ["user", "1"] } }));
await check("swr", swrAdapter(() => undefined), target("swr", "/api/user/1", "revalidate"));
await check("rtk-query", rtkQueryAdapter({ api: { util: { invalidateTags: (tags) => ({ type: "invalidate", payload: tags }) } }, store: { dispatch: () => undefined } }), target("rtk-query", "User:1", "invalidate", { meta: { tags: ["User:1"] } }));
await check("trpc", trpcAdapter({ utils: { user: { byId: { invalidate: () => undefined } } } }), target("trpc", "user.byId", "invalidate"));
await check("zustand", zustandAdapter({ getState: () => ({}), setState: () => undefined }), target("zustand", "users.1", "patch"));
await check("next", nextCacheAdapter({ allowClient: true, revalidateTag: () => undefined }), target("next", "user:1", "revalidate", { meta: { kind: "tag" } }));
await check("apollo", apolloAdapter({ cache: { evict: () => true, modify: () => true, gc: () => undefined } }), target("apollo", "User:1", "invalidate"));
await check("graphql", graphqlAdapter({ cache: { invalidate: () => undefined, evict: () => undefined, refetch: () => undefined } }), target("graphql", "User:1", "invalidate"));
await check("cloudflare-kv", cloudflareKvAdapter({ namespace: { delete: async () => undefined } }), target("cloudflare-kv", "user:1", "delete"));
await check("websocket", websocketAdapter({ emit: () => undefined }), target("socket", "room:1", "notify", { meta: { event: "changed" } }));
await check("search", searchAdapter({ handler: () => undefined }), target("search", "products:1", "enqueue", { meta: { index: "products", id: "1" } }));
await check("http", httpAdapter({ fetch: async () => new Response("ok") }), target("http", "https://example.test/hook", "publish"));

const failures = rows.filter((row) => row.slice(1).some((value) => value !== "pass"));
await writeReport(
  "adapter-conformance-report",
  ["# Adapter Conformance Report", "", markdownTable(["Adapter", "Valid target", "Best-effort surfaces failure", "Strict throws", "Missing adapter surfaces failure"], rows)].join("\n"),
  rows
);

if (failures.length > 0) {
  throw new Error(`Adapter conformance failures: ${failures.map((row) => row[0]).join(", ")}`);
}
