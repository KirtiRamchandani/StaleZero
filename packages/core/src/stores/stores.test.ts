import { describe, expect, it } from "vitest";
import { createReceipt } from "../receipt.js";
import { DynamoDbReceiptStore } from "./dynamodb-store.js";
import { OpenSearchReceiptStore } from "./opensearch-store.js";
import { S3ReceiptStore } from "./s3-store.js";

function sampleReceipt(id: string) {
  return createReceipt({
    id,
    mutation: "UserUpdated",
    payload: { userId: "1" },
    affected: [{ type: "User", id: "1" }],
    targets: [{ adapter: "memory", key: "user:1", action: "invalidate" }],
    results: [{ adapter: "memory", key: "user:1", status: "success", durationMs: 1, attempts: 1, target: { adapter: "memory", key: "user:1", action: "invalidate" } }],
    status: "success",
    durationMs: 2,
    timestamp: Date.now(),
    actor: "user-1",
    tenant: "tenant-a"
  });
}

describe("cloud receipt stores", () => {
  it("stores and lists receipts in S3", async () => {
    const objects = new Map<string, string>();
    const store = new S3ReceiptStore({
      client: {
        putObject: async ({ Key, Body }) => {
          objects.set(Key, Body);
        },
        getObject: async ({ Key }) => ({ Body: objects.get(Key) }),
        listObjectsV2: async ({ Prefix }) => ({
          Contents: [...objects.keys()].filter((key) => key.startsWith(Prefix)).map((Key) => ({ Key }))
        }),
        deleteObject: async ({ Key }) => {
          objects.delete(Key);
        }
      },
      bucket: "receipts",
      prefix: "stalezero/"
    });
    const receipt = sampleReceipt("r-s3");
    await store.save(receipt);
    expect((await store.get("r-s3"))?.mutation).toBe("UserUpdated");
    expect((await store.list({ actor: "user-1" }))).toHaveLength(1);
  });

  it("stores and lists receipts in DynamoDB", async () => {
    const table = new Map<string, Record<string, unknown>>();
    const store = new DynamoDbReceiptStore({
      client: {
        put: async ({ Item }) => {
          table.set(String(Item.id), Item);
        },
        get: async ({ Key }) => ({ Item: table.get(String(Key.id)) }),
        scan: async () => ({ Items: [...table.values()] })
      },
      table: "receipts"
    });
    const receipt = sampleReceipt("r-ddb");
    await store.save(receipt);
    expect((await store.list({ tenant: "tenant-a" }))).toHaveLength(1);
  });

  it("stores and lists receipts in OpenSearch", async () => {
    const docs = new Map<string, Record<string, unknown>>();
    const store = new OpenSearchReceiptStore({
      client: {
        index: async ({ id, body }) => {
          docs.set(id, body);
        },
        get: async ({ id }) => ({ _source: docs.get(id) }),
        search: async () => ({
          hits: { hits: [...docs.values()].map((_source) => ({ _source })) }
        })
      },
      index: "receipts"
    });
    const receipt = sampleReceipt("r-os");
    await store.save(receipt);
    expect((await store.list({ status: "success" }))).toHaveLength(1);
  });
});
