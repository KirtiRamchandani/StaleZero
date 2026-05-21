export type MaybePromise<T> = T | Promise<T>;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type EntityRef = {
  type: string;
  id: string;
};

export type TargetAction =
  | "delete"
  | "invalidate"
  | "refetch"
  | "patch"
  | "remove"
  | "notify"
  | "revalidate"
  | "purge"
  | "enqueue"
  | "publish"
  | "custom";

export type TargetRef<
  AdapterName extends string = string,
  Meta extends Record<string, unknown> = Record<string, unknown>
> = {
  adapter: AdapterName;
  key: string;
  action: TargetAction;
  meta?: Meta;
  priority?: number;
  required?: boolean;
  timeoutMs?: number;
  retries?: number;
  label?: string;
  group?: string;
  lane?: string;
};

export type MutationContext<Input = unknown> = {
  id: string;
  mutation: string;
  input: Input;
  affected: EntityRef[];
  timestamp: number;
  app?: string;
  environment?: string;
  traceId?: string;
  source?: string;
  dryRun: boolean;
};

export type Adapter<Target extends TargetRef = TargetRef> = {
  name: string;
  execute: (target: Target, context: MutationContext) => MaybePromise<void>;
  batchExecute?: (targets: Target[], context: MutationContext) => MaybePromise<void>;
  health?: () => MaybePromise<"ok" | { status: string; details?: unknown }>;
  shutdown?: () => MaybePromise<void>;
};

export type ExecutionStatus = "success" | "failed" | "skipped";

export type ExecutionResult = {
  adapter: string;
  key: string;
  action: TargetAction;
  status: ExecutionStatus;
  durationMs: number;
  attempts: number;
  target: TargetRef;
  skippedReason?: string;
  batch?: {
    key: string;
    size: number;
  };
  coalesced?: {
    count: number;
  };
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
};

export type ReceiptStatus = "success" | "partial" | "failed" | "dry-run";

export type Receipt = {
  id: string;
  mutation: string;
  input: unknown;
  affected: EntityRef[];
  targets: TargetRef[];
  results: ExecutionResult[];
  status: ReceiptStatus;
  durationMs: number;
  timestamp: number;
  app?: string;
  traceId?: string;
  risk?: RiskResult;
  slo?: SloEvaluation;
  approval?: {
    required: boolean;
    granted: boolean;
    approver?: string;
  };
  toJSON: () => ReceiptSnapshot;
  toText: () => string;
  hasFailures: () => boolean;
  hasBlockingFailures: () => boolean;
  assertSuccess: () => void;
};

export type ReceiptSnapshot = Omit<Receipt, "toJSON" | "toText" | "hasFailures" | "hasBlockingFailures" | "assertSuccess">;

export type SchemaLike<Input> =
  | { parse: (input: unknown) => Input }
  | { safeParse: (input: unknown) => { success: true; data: Input } | { success: false; error: unknown } }
  | { validate: (input: unknown) => MaybePromise<Input> }
  | {
      "~standard": {
        validate: (input: unknown) => MaybePromise<{ value: Input } | { issues: unknown[] }>;
      };
    };

export type InferSchemaInput<TSchema> = TSchema extends { parse: (input: unknown) => infer TInput }
  ? TInput
  : TSchema extends { safeParse: (input: unknown) => { success: true; data: infer TInput } | { success: false; error: unknown } }
    ? TInput
    : TSchema extends { validate: (input: unknown) => MaybePromise<infer TInput> }
      ? TInput
      : TSchema extends { "~standard": { validate: (input: unknown) => MaybePromise<{ value: infer TInput } | { issues: unknown[] }> } }
        ? TInput
        : unknown;

export type MutationDefinition<Input = unknown> = {
  schema?: SchemaLike<Input>;
  affects?: (input: Input) => MaybePromise<EntityRef[]>;
  targets?: (input: Input, context: MutationContext<Input>) => MaybePromise<TargetRef[]>;
  source?: string;
};

export type MirrorDefinition<Input = unknown> = {
  when: string | string[];
  target: (input: Input, context: MutationContext<Input>) => MaybePromise<TargetRef | TargetRef[] | undefined | null>;
  dependsOn?: (input: Input, context: MutationContext<Input>) => MaybePromise<EntityRef[]>;
  description?: string;
};

export type CommandDefinition<Input = unknown, Output = unknown> = {
  schema?: SchemaLike<Input>;
  run: (args: { input: Input; context: { traceId?: string; source?: string } }) => MaybePromise<Output>;
  affects?: (args: { input: Input; output: Output }) => MaybePromise<EntityRef[]>;
  changed?: string;
};

export type ConsistencyMode = "best-effort" | "strict" | "dry-run";

export type ChangedOptions = {
  consistency?: ConsistencyMode;
  dryRun?: boolean;
  traceId?: string;
  source?: string;
  publish?: boolean;
  idempotencyKey?: string;
  actor?: unknown;
  approvalToken?: string;
};

export type Preview = {
  mutation: string;
  input: unknown;
  affected: EntityRef[];
  targets: TargetRef[];
  risk?: RiskResult;
  toText: () => string;
  toJSON: () => {
    mutation: string;
    input: unknown;
    affected: EntityRef[];
    targets: TargetRef[];
    risk?: RiskResult;
  };
};

export type WhyResult = {
  target: string;
  dependsOn: EntityRef[];
  mutations: string[];
  lastReceipt?: Receipt;
  toText: () => string;
};

export type StaleEvent<Input = unknown> = {
  id: string;
  app?: string;
  environment?: string;
  mutation: string;
  input: Input;
  affected: EntityRef[];
  timestamp: number;
  traceId?: string;
  source?: string;
  hops: number;
};

export type EventBus = {
  name: string;
  publish: (event: StaleEvent) => MaybePromise<void>;
  subscribe: (handler: (event: StaleEvent) => MaybePromise<void>) => MaybePromise<() => MaybePromise<void> | void>;
};

export type ReceiptStore = {
  save: (receipt: Receipt) => MaybePromise<void>;
  get: (id: string) => MaybePromise<Receipt | undefined>;
  list: (options?: { limit?: number; mutation?: string }) => MaybePromise<Receipt[]>;
  prune?: (options?: { maxAgeMs?: number; maxEntries?: number }) => MaybePromise<number>;
  export?: (options?: { mutation?: string }) => MaybePromise<Receipt[]>;
};

export type RiskLevel = "low" | "medium" | "high" | "critical";

export type RiskResult = {
  level: RiskLevel;
  score: number;
  reasons: string[];
  targetCount: number;
};

export type SloConfig = {
  maxDurationMs?: number;
  maxFailureRate?: number;
  requiredTargets?: string[];
};

export type SloEvaluation = {
  status: "passed" | "failed";
  checks: Array<{
    name: string;
    status: "passed" | "failed";
    actual?: number | string;
    limit?: number | string;
    message?: string;
  }>;
};

export type StudioOptions = {
  studio?: boolean;
  preview?: boolean;
  replay?: boolean;
  compare?: boolean;
  production?: boolean;
};

export type StudioApi = {
  options: StudioOptions;
  manifest: Manifest;
  handler: (request: unknown, response?: unknown) => Promise<unknown>;
};

export type MutationSnapshotData = {
  version: 1;
  mutation: string;
  input: unknown;
  affected: EntityRef[];
  targets: TargetRef[];
  risk: RiskResult;
  createdAt: string;
};

export type MutationSnapshot = MutationSnapshotData & {
  toJSON: () => MutationSnapshotData;
  toText: () => string;
};

export type SnapshotDiffData = {
  mutation: string;
  added: string[];
  removed: string[];
  unchanged: string[];
  risk: RiskLevel;
};

export type SnapshotDiff = SnapshotDiffData & {
  toJSON: () => SnapshotDiffData;
  toText: () => string;
};

export type ReplayMode = "sandbox" | "dry-run" | "safe-replay" | "force";

export type ReplayResult = {
  mode: ReplayMode;
  receipt: Receipt;
  executed: TargetRef[];
  skipped: TargetRef[];
  toText: () => string;
};

export type MutationContract = {
  input: unknown;
  affects?: Array<EntityRef | [string, string]>;
  invalidates?: string[];
  notInvalidates?: string[];
  maxRisk?: RiskLevel;
};

export type MutationContractResult = {
  mutation: string;
  passed: boolean;
  failures: string[];
};

export type RecipeInstaller<Stale = unknown> =
  | ((stale: Stale) => MaybePromise<void>)
  | { install: (stale: Stale) => MaybePromise<void> };

export type TemplateDefinition<Input = unknown> = MutationDefinition<Input> & {
  mirrors?: Record<string, MirrorDefinition<Input>> | MirrorDefinition<Input>[];
};

export type ResourceDefinition = {
  id: string | ((input: Record<string, unknown>) => string | number);
  cache?: boolean | { prefix?: string };
  query?: boolean | { key?: (id: string, input: Record<string, unknown>) => unknown[] };
  next?: boolean | { tag?: (id: string, input: Record<string, unknown>) => string };
  socket?: boolean | { room?: (id: string, input: Record<string, unknown>) => string; event?: string };
};

export type CompiledManifest = Manifest & {
  indexes: {
    mutationToTargets: Record<string, string[]>;
    targetToMutations: Record<string, string[]>;
    adapterToTargets: Record<string, string[]>;
  };
};

export type CoalesceConfig = {
  windowMs: number;
  by?: "target" | "entity" | "mutation";
};

export type SecurityConfig = {
  mode?: "best-effort" | "strict";
  requireActor?: boolean;
  requireSchema?: boolean;
  requireTenantBoundary?: boolean;
  blockUnsafeTargets?: boolean;
};

export type TenantConfig = {
  actorTenant: (args: { actor: unknown; input: unknown }) => string | undefined;
  inputTenant: (args: { actor: unknown; input: unknown }) => string | undefined;
  blockCrossTenant?: boolean;
};

export type SandboxConfig = {
  allowedPrefixes?: string[];
  denyPatterns?: string[];
  maxKeysPerMutation?: number;
};

export type RedactionOptions = {
  keys?: string[];
  receipts?: boolean;
  devtools?: boolean;
  buses?: boolean;
  redactWith?: (key: string, value: unknown, path: string[]) => unknown;
};

export type ApprovalConfig = {
  requiredWhen: (args: { preview: Preview; risk: RiskResult }) => boolean;
  approvers?: string[];
};

export type RiskConfig = {
  block?: RiskLevel;
  requireApproval?: RiskLevel;
};

export type RateLimitConfig = {
  max: number;
  windowMs: number;
  key?: (args: { input: unknown; actor?: unknown }) => string;
};

export type InboxStore = {
  save: (event: StaleEvent) => MaybePromise<void>;
  has?: (id: string) => MaybePromise<boolean>;
  markProcessed?: (id: string, receipt: Receipt) => MaybePromise<void>;
  markFailed?: (id: string, error: unknown) => MaybePromise<void>;
  deadLetter?: (id: string, error: unknown) => MaybePromise<void>;
};

export type InboxConfig = {
  store?: InboxStore;
  dedupeBy?: "event.id" | ((event: StaleEvent) => string);
  verifySignature?: boolean | ((event: StaleEvent) => MaybePromise<boolean>);
};

export type InboxApi = {
  process: (event: StaleEvent) => Promise<Receipt | undefined>;
  replay: (event: StaleEvent) => Promise<Receipt | undefined>;
  deadLetter: (event: StaleEvent, error: unknown) => Promise<void>;
};

export type WorkflowStep = {
  id: string;
  status: "success" | "failed" | "skipped";
  durationMs: number;
  error?: string;
};

export type WorkflowResult = {
  id: string;
  name: string;
  steps: WorkflowStep[];
  status: "success" | "failed";
};

export type WorkflowStepRunner = <T>(
  name: string,
  run: () => MaybePromise<T>,
  options?: { idempotencyKey?: string; skip?: boolean; compensate?: () => MaybePromise<void> }
) => Promise<T | undefined>;

export type BlackboxConfig = {
  enabled?: boolean;
  retainLast?: number;
  redact?: boolean;
};

export type BlackboxEntry = {
  id: string;
  mutation: string;
  input: unknown;
  preview: {
    affected: EntityRef[];
    targets: TargetRef[];
    risk?: RiskResult;
  };
  receipt?: ReceiptSnapshot;
  timestamp: number;
  traceId?: string;
};

export type CircuitBreakerConfig = {
  enabled?: boolean;
  failureThreshold?: number;
  cooldownMs?: number;
};

export type RetryConfig = {
  backoffMs?: number;
  maxBackoffMs?: number;
  jitter?: boolean;
};

export type ExecutionConfig = {
  defaultConsistency?: ConsistencyMode;
  timeoutMs?: number;
  retries?: number;
  retry?: RetryConfig;
  concurrency?: number;
  dedupeWindowMs?: number;
  payloadLimitBytes?: number;
  warnOnMemoryReceiptStoreInProduction?: boolean;
  circuitBreaker?: CircuitBreakerConfig;
  rateLimitPerSecond?: number;
};

export type DistributedConfig = {
  enabled?: boolean;
  ignoreSelf?: boolean;
  maxHops?: number;
  dedupeTtlMs?: number;
};

export type ReceiptConfig = {
  enabled?: boolean;
  sampleRate?: number;
  redact?: string[];
  redactWith?: (key: string, value: unknown, path: string[]) => unknown;
  secretSafe?: boolean;
  retentionMs?: number;
  maxEntries?: number;
};

export type AuditEvent =
  | { type: "adapter-result"; result: ExecutionResult; context: MutationContext }
  | { type: "receipt"; receipt: Receipt }
  | { type: "event-published"; event: StaleEvent; bus: string };

export type StaleZeroHooks = {
  onAdapterResult?: (event: Extract<AuditEvent, { type: "adapter-result" }>) => MaybePromise<void>;
  onReceipt?: (event: Extract<AuditEvent, { type: "receipt" }>) => MaybePromise<void>;
  onEventPublished?: (event: Extract<AuditEvent, { type: "event-published" }>) => MaybePromise<void>;
  onAudit?: (event: AuditEvent) => MaybePromise<void>;
};

export type StaleZeroConfig = {
  app?: string;
  environment?: string;
  source?: string;
  execution?: ExecutionConfig;
  distributed?: DistributedConfig;
  receipts?: ReceiptConfig;
  hooks?: StaleZeroHooks;
};

export type Manifest = {
  app?: string;
  environment?: string;
  sources?: string[];
  mutations: Record<string, { source?: string; mirrors: string[] }>;
  mirrors: Record<string, { when: string[]; description?: string }>;
  adapters: string[];
  generatedAt: string;
};
