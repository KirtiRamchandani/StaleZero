import type {
  ChangedOptions,
  EntityRef,
  ExecutionResult,
  MaybePromise,
  MutationContext,
  Preview,
  Receipt,
  RiskResult,
  TargetRef
} from "../types.js";

export type PipelineContext = {
  mutation: string;
  input: unknown;
  parsed?: unknown;
  affected?: EntityRef[];
  context?: MutationContext;
  changedFields?: string[];
  targets?: TargetRef[];
  risk?: RiskResult;
  preview?: Preview;
  approval?: Receipt["approval"];
  results?: ExecutionResult[];
  receipt?: Receipt;
  error?: unknown;
  options?: ChangedOptions;
  dryRun?: boolean;
  proofOnly?: boolean;
};

export type PipelineHooks = {
  beforeParse?: (ctx: PipelineContext) => MaybePromise<void | Partial<PipelineContext>>;
  afterParse?: (ctx: PipelineContext) => MaybePromise<void | Partial<PipelineContext>>;
  beforePreview?: (ctx: PipelineContext) => MaybePromise<void | Partial<PipelineContext>>;
  afterPreview?: (ctx: PipelineContext) => MaybePromise<void | Partial<PipelineContext>>;
  beforeGuard?: (ctx: PipelineContext) => MaybePromise<void | Partial<PipelineContext>>;
  afterGuard?: (ctx: PipelineContext) => MaybePromise<void | Partial<PipelineContext>>;
  beforeExecute?: (ctx: PipelineContext) => MaybePromise<void | Partial<PipelineContext>>;
  afterTarget?: (ctx: PipelineContext & { target: TargetRef; result: ExecutionResult; index: number }) => MaybePromise<void>;
  afterExecute?: (ctx: PipelineContext) => MaybePromise<void | Partial<PipelineContext>>;
  beforeReceipt?: (ctx: PipelineContext) => MaybePromise<void | Partial<PipelineContext>>;
  afterReceipt?: (ctx: PipelineContext) => MaybePromise<void | Partial<PipelineContext>>;
  onFailure?: (ctx: PipelineContext) => MaybePromise<void>;
};

export async function runPipelineHooks<K extends keyof PipelineHooks>(
  hooks: PipelineHooks | undefined,
  stage: K,
  ctx: PipelineContext,
  extra?: K extends "afterTarget" ? { target: TargetRef; result: ExecutionResult; index: number } : never
): Promise<PipelineContext> {
  if (!hooks) {
    return ctx;
  }
  const hook = hooks[stage];
  if (!hook) {
    return ctx;
  }
  try {
    const input = extra ? { ...ctx, ...extra } : ctx;
    const patch = await (hook as (input: PipelineContext) => MaybePromise<void | Partial<PipelineContext>>)(input as PipelineContext);
    if (patch && typeof patch === "object") {
      return { ...ctx, ...patch };
    }
    return ctx;
  } catch (error) {
    const failed = { ...ctx, error };
    await hooks.onFailure?.(failed);
    throw error;
  }
}
