import type { Adapter, MutationContext, TargetRef } from "@stalezero/core";

export type SearchJob = {
  operation: "reindex" | "delete" | "refresh";
  index: string;
  id?: string;
  target: TargetRef<"search">;
  context: MutationContext;
};

export type SearchQueueLike = {
  enqueue?: (job: SearchJob) => Promise<unknown> | unknown;
  add?: (name: string, payload: SearchJob) => Promise<unknown> | unknown;
};

export type SearchAdapterOptions = {
  name?: string;
  queue?: SearchQueueLike;
  handler?: (job: SearchJob) => Promise<unknown> | unknown;
};

export function searchAdapter(options: SearchAdapterOptions): Adapter<TargetRef<"search">> {
  return {
    name: options.name ?? "search",
    execute: async (target, context) => {
      if (target.action !== "enqueue" && target.action !== "delete" && target.action !== "refetch") {
        throw new Error(`Search adapter does not support ${target.action}`);
      }
      const job: SearchJob = {
        operation: (target.meta?.operation as SearchJob["operation"]) ?? "reindex",
        index: String(target.meta?.index ?? target.key.split(":")[0] ?? target.key),
        id: typeof target.meta?.id === "string" ? target.meta.id : target.key.split(":").slice(1).join(":") || undefined,
        target,
        context
      };

      if (options.handler) {
        await options.handler(job);
        return;
      }

      if (options.queue?.enqueue) {
        await options.queue.enqueue(job);
        return;
      }

      if (options.queue?.add) {
        await options.queue.add("stalezero.search", job);
        return;
      }

      throw new Error("No search queue or handler was provided");
    }
  };
}

export function meilisearchHandler(client: { index: (name: string) => { updateDocuments?: (docs: unknown[]) => unknown; deleteDocument?: (id: string) => unknown } }) {
  return async (job: SearchJob): Promise<void> => {
    const index = client.index(job.index);
    if (job.operation === "delete" && job.id && index.deleteDocument) {
      await index.deleteDocument(job.id);
    }
  };
}

export function algoliaHandler(client: { initIndex: (name: string) => { deleteObject?: (id: string) => unknown; partialUpdateObject?: (body: unknown) => unknown } }) {
  return async (job: SearchJob): Promise<void> => {
    const index = client.initIndex(job.index);
    if (job.operation === "delete" && job.id && index.deleteObject) {
      await index.deleteObject(job.id);
    }
  };
}
