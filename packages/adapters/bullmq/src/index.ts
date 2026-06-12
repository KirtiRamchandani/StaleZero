import type { Adapter, MutationContext, TargetRef } from "@stalezero/core";

export type BullMQQueueLike = {
  add?: (name: string, data: unknown, opts?: Record<string, unknown>) => Promise<unknown> | unknown;
};

export type BullMQAdapterOptions = {
  name?: string;
  defaultJobName?: string;
  resolveQueue?: (target: TargetRef<"bullmq">, context: MutationContext) => BullMQQueueLike | undefined;
};

export function bullmqAdapter(
  queue: BullMQQueueLike | Record<string, BullMQQueueLike>,
  options: BullMQAdapterOptions = {}
): Adapter<TargetRef<"bullmq">> {
  return {
    name: options.name ?? "bullmq",
    execute: async (target, context) => {
      if (target.action !== "enqueue") {
        throw new Error(`BullMQ adapter does not support ${target.action}`);
      }

      const resolved = resolveQueue(queue, target, context, options);
      if (!resolved?.add) {
        throw new Error("BullMQ queue does not expose add()");
      }

      const jobName = String(target.meta?.jobName ?? options.defaultJobName ?? "stalezero.enqueue");
      const payload = {
        mutation: context.mutation,
        input: context.input,
        affected: context.affected,
        receipt: context.id,
        queue: target.key,
        target: target.key,
        meta: target.meta?.payload ?? target.meta
      };

      const jobOpts = isRecord(target.meta?.jobOpts) ? target.meta.jobOpts : undefined;

      await withAbortSignal(context.signal, () => resolved.add!(jobName, payload, jobOpts));
    }
  };
}

function resolveQueue(
  queue: BullMQQueueLike | Record<string, BullMQQueueLike>,
  target: TargetRef<"bullmq">,
  context: MutationContext,
  options: BullMQAdapterOptions
): BullMQQueueLike | undefined {
  if (options.resolveQueue) {
    return options.resolveQueue(target, context);
  }
  if (typeof queue.add === "function") {
    return queue;
  }
  return (queue as Record<string, BullMQQueueLike>)[target.key];
}

async function withAbortSignal<T>(signal: AbortSignal | undefined, fn: () => Promise<T> | T): Promise<T> {
  if (signal?.aborted) {
    throw signal.reason ?? new Error("Aborted");
  }

  let onAbort: (() => void) | undefined;
  const run = Promise.resolve(fn());

  if (!signal) {
    return run;
  }

  const aborted = new Promise<never>((_, reject) => {
    onAbort = () => reject(signal.reason ?? new Error("Aborted"));
    signal.addEventListener("abort", onAbort, { once: true });
  });

  try {
    return await Promise.race([run, aborted]);
  } finally {
    if (onAbort) {
      signal.removeEventListener("abort", onAbort);
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
