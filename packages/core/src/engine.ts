import { createId, now } from "./ids.js";
import { createReceipt, receiptToText } from "./receipt.js";
import { MemoryReceiptStore } from "./store.js";
import {
  customTarget,
  entity,
  httpTarget,
  jobTarget,
  nextPathTarget,
  nextTagTarget,
  queryTarget,
  redisPatternTarget,
  redisTarget,
  reduxTarget,
  searchTarget,
  socketTarget,
  swrTarget,
  target,
  zustandTarget
} from "./targets.js";
import type {
  Adapter,
  ApprovalConfig,
  AuditEvent,
  BadgeResult,
  BlackboxConfig,
  BlackboxEntry,
  BrowserHelperOptions,
  CanaryResult,
  ChaosConfig,
  ChangedOptions,
  CommandDefinition,
  CompiledManifest,
  ConsistencyProfile,
  ConsistencyMode,
  CoalesceConfig,
  CostReport,
  Diagnostic,
  DriftApi,
  DriftFinding,
  DriftProbe,
  DriftReport,
  EntityRef,
  EventBus,
  ExplainStaleReport,
  ExecutionResult,
  ExecutionStatus,
  FlowResult,
  FlowStepOptions,
  FlowStepReceipt,
  FreshnessBudget,
  FreshnessStatus,
  GraphLintFinding,
  GraphLintReport,
  GraphLintRule,
  HeatmapReport,
  HumanReceipt,
  InboxApi,
  InboxConfig,
  Manifest,
  MaybePromise,
  MarketplaceEntry,
  MirrorDefinition,
  MutationContract,
  MutationContractResult,
  MutationContext,
  MutationDefinition,
  MutationSnapshot,
  MutationSnapshotData,
  NotifyConfig,
  OptimizationReport,
  OwnershipMap,
  Playbook,
  Preview,
  PreviewConfidence,
  ProjectScore,
  ProofResult,
  RateLimitConfig,
  Receipt,
  ReceiptStore,
  RecipeInstaller,
  RedactionOptions,
  ReplayOptions,
  ReplayResult,
  ResourceBuilderApi,
  ResourceDefinition,
  ResourceRecipe,
  RiskConfig,
  RiskLevel,
  RiskResult,
  RolloutConfig,
  Runbook,
  SandboxConfig,
  SchemaLike,
  SchemaRegistryApi,
  SecurityConfig,
  ServiceContract,
  ServiceContractReport,
  ShadowConfig,
  SloConfig,
  SloEvaluation,
  SnapshotDiff,
  StateProof,
  StudioApi,
  StudioOptions,
  StaleEvent,
  StaleZeroConfig,
  TemplateDefinition,
  TenantConfig,
  TargetAction,
  TargetRef,
  TimeMachineApi,
  UndoPreview,
  UndoResult,
  UndoableDefinition,
  WorkflowResult,
  WorkflowStep,
  WorkflowStepRunner,
  WhyResult
} from "./types.js";

type MutationMap = Record<string, unknown>;
type MirrorRecord = {
  name: string;
  definition: MirrorDefinition;
};
type CommandRecord = {
  name: string;
  definition: CommandDefinition;
};
export type AutopilotRecipeOptions = {
  redis?: boolean;
  reactQuery?: boolean;
  nextTag?: boolean;
  socket?: boolean;
  search?: boolean;
  tenantGuard?: boolean;
  owner?: string;
  searchIndex?: string;
};
type ResolvedExecutionConfig = Required<Omit<NonNullable<StaleZeroConfig["execution"]>, "retry" | "circuitBreaker">> & {
  retry: Required<NonNullable<NonNullable<StaleZeroConfig["execution"]>["retry"]>>;
  circuitBreaker: Required<NonNullable<NonNullable<StaleZeroConfig["execution"]>["circuitBreaker"]>>;
};
type ResolvedReceiptConfig = Required<Omit<NonNullable<StaleZeroConfig["receipts"]>, "redactWith" | "retentionMs" | "maxEntries">> & {
  redactWith?: NonNullable<StaleZeroConfig["receipts"]>["redactWith"];
  retentionMs?: number;
  maxEntries?: number;
};
type ResolvedConfig = Omit<StaleZeroConfig, "execution" | "distributed" | "receipts"> & {
  execution: ResolvedExecutionConfig;
  distributed: Required<NonNullable<StaleZeroConfig["distributed"]>>;
  receipts: ResolvedReceiptConfig;
};
type ExecuteRequest = {
  mutation: string;
  input: unknown;
  explicitTargets?: TargetRef[];
  explicitAffected?: EntityRef[];
  options?: ChangedOptions;
};
type CircuitState = {
  failures: number;
  openUntil: number;
};

export type MutationInput<TDefinition> = TDefinition extends { schema: SchemaLike<infer TInput> }
  ? TInput
  : TDefinition extends MutationDefinition<infer TInput>
    ? TInput
    : unknown;

export type CommandInput<TDefinition> = TDefinition extends { schema: SchemaLike<infer TInput> }
  ? TInput
  : TDefinition extends CommandDefinition<infer TInput>
    ? TInput
    : unknown;

export type ReceiptsApi = {
  list: (options?: { limit?: number; mutation?: string }) => Promise<Receipt[]>;
  export: (options?: { mutation?: string }) => Promise<Receipt[]>;
};

export interface StaleZero<Mutations extends MutationMap = {}> {
  readonly receipts: ReceiptsApi;
  use(adapter: Adapter): this;
  useBus(bus: EventBus): this;
  useReceiptStore(store: ReceiptStore): this;
  source(name: string): this;
  mutation<const Name extends string, Input = unknown>(
    name: Name,
    definition: MutationDefinition<Input>
  ): StaleZero<Mutations & Record<Name, Input>>;
  mirror<Input = unknown>(name: string, definition: MirrorDefinition<Input>): this;
  view<Input = unknown>(name: string, definition: MirrorDefinition<Input>): this;
  command<Input = unknown, Output = unknown>(name: string, definition: CommandDefinition<Input, Output>): this;
  changed<const Name extends string>(
    name: Name,
    input: Name extends keyof Mutations ? Mutations[Name] : unknown,
    options?: ChangedOptions
  ): Promise<Receipt>;
  changedMany(
    changes: Array<{ mutation: string; input: unknown; options?: ChangedOptions }>,
    options?: ChangedOptions
  ): Promise<Receipt[]>;
  mutate<const Name extends string>(
    name: Name,
    input: Name extends keyof Mutations ? Mutations[Name] : unknown
  ): QuickMutationBuilder;
  run<Input = unknown>(name: string, input: Input, options?: ChangedOptions): Promise<{ output: unknown; receipt: Receipt }>;
  preview<const Name extends string>(
    name: Name,
    input: Name extends keyof Mutations ? Mutations[Name] : unknown
  ): Promise<Preview>;
  snapshot<const Name extends string>(
    name: Name,
    input: Name extends keyof Mutations ? Mutations[Name] : unknown
  ): Promise<MutationSnapshot>;
  compareSnapshots(left: MutationSnapshot | MutationSnapshotData, right: MutationSnapshot | MutationSnapshotData): Promise<SnapshotDiff>;
  replay(receipt: string | Receipt, options?: ReplayOptions): Promise<ReplayResult>;
  prove(receipt: string | Receipt, options?: { timeoutMs?: number; retries?: number; ci?: boolean }): Promise<Receipt>;
  contract(name: string, definition: MutationContract): Promise<MutationContractResult>;
  lint(options?: { ci?: boolean; rules?: GraphLintRule[]; autofix?: boolean }): Promise<GraphLintReport>;
  flow<const Name extends string>(
    name: Name,
    input: Name extends keyof Mutations ? Mutations[Name] : unknown
  ): StaleZeroFlowBuilder;
  undoable<Input = unknown>(name: string, definition: UndoableDefinition<Input>): this;
  previewUndo(receipt: string | Receipt, options?: { actor?: unknown }): Promise<UndoPreview>;
  undo(receipt: string | Receipt, options?: { actor?: unknown; approvalToken?: string; consistency?: ConsistencyMode }): Promise<UndoResult>;
  timeMachine(): TimeMachineApi;
  readonly drift: DriftApi;
  impact<const Name extends string>(
    name: Name,
    input: Name extends keyof Mutations ? Mutations[Name] : unknown
  ): Promise<RiskResult>;
  playbook(receipt: string | Receipt): Promise<Playbook>;
  emits(event: string, schema: ServiceContract["schema"], options?: { service?: string }): this;
  consumes(event: string, schema: ServiceContract["schema"], options?: { service?: string }): this;
  contractCheck(): ServiceContractReport;
  schemaRegistry(): SchemaRegistryApi;
  canary<const Name extends string>(
    name: Name,
    input: Name extends keyof Mutations ? Mutations[Name] : unknown
  ): Promise<CanaryResult>;
  marketplace(): MarketplaceEntry[];
  incident(receipt: string | Receipt): Promise<string>;
  cost<const Name extends string>(
    name: Name,
    input: Name extends keyof Mutations ? Mutations[Name] : unknown
  ): Promise<CostReport>;
  explainStale(entity: string, options?: { input?: unknown }): Promise<ExplainStaleReport>;
  heatmap(options?: { limit?: number; owner?: string }): Promise<HeatmapReport>;
  optimizeCost(options?: { limit?: number }): Promise<OptimizationReport>;
  freshness(name: string, budget: FreshnessBudget): this;
  profile(name: string, config: ConsistencyProfile): this;
  rollout(name: string, config: RolloutConfig): this;
  shadow(name: string, config: ShadowConfig): this;
  ownershipMap(): OwnershipMap;
  score(): Promise<ProjectScore>;
  badge(): Promise<BadgeResult>;
  chaos(config: ChaosConfig): this;
  browserHelper(options?: BrowserHelperOptions): string;
  humanReceipt(receipt: string | Receipt): Promise<HumanReceipt>;
  notify(config: NotifyConfig): this;
  runbooks(): Runbook[];
  autopilotRecipes(): {
    saasEntity: (options?: AutopilotRecipeOptions) => ResourceRecipe;
    commerceProduct: (options?: AutopilotRecipeOptions) => ResourceRecipe;
    authSession: (options?: AutopilotRecipeOptions) => ResourceRecipe;
    webhook: (options?: AutopilotRecipeOptions) => ResourceRecipe;
    searchBackedEntity: (options?: AutopilotRecipeOptions) => ResourceRecipe;
    multiTenant: (options?: AutopilotRecipeOptions) => ResourceRecipe;
    serverless: (options?: AutopilotRecipeOptions) => ResourceRecipe;
  };
  diagnostics(): Diagnostic[];
  codeowners(): string;
  why(targetName: string, input?: unknown): Promise<WhyResult>;
  receipt(id: string): Promise<Receipt | undefined>;
  exportReceipts(options?: { mutation?: string }): Promise<Receipt[]>;
  useRecipe(recipe: RecipeInstaller<this>): Promise<this>;
  useTemplate<Input = unknown>(name: string, definition: TemplateDefinition<Input>): this;
  resource(name: string, definition: ResourceDefinition): StaleZeroResourceBuilder;
  compileManifest(): CompiledManifest;
  coalesce(config: CoalesceConfig): this;
  slo(name: string, config: SloConfig): this;
  devtools(options?: StudioOptions): StudioApi;
  security(config: SecurityConfig): this;
  tenant(config: TenantConfig): this;
  sandbox(adapter: string, config: SandboxConfig): this;
  redact(options: RedactionOptions): this;
  approval(name: string, config: ApprovalConfig): this;
  risk(config: RiskConfig): this;
  rateLimit(name: string, config: RateLimitConfig): this;
  inbox(config?: InboxConfig): InboxApi;
  workflow<Input = unknown>(
    name: string,
    input: Input,
    run: (step: WorkflowStepRunner) => MaybePromise<void>,
    options?: { idempotencyKey?: string }
  ): Promise<WorkflowResult>;
  blackbox(config: BlackboxConfig): this;
  blackboxEntries(): BlackboxEntry[];
  status(): Promise<{ adapters: string[]; mutations: string[]; mirrors: string[]; receipts: number }>;
  health(): Promise<{
    status: "ok" | "degraded";
    adapters: Array<{ name: string; status: string; details?: unknown; error?: string }>;
    receipts: number;
  }>;
  ready(): Promise<boolean>;
  shutdown(): Promise<void>;
  devtoolsHandler(): (request: unknown, response?: unknown) => Promise<unknown>;
  generateManifest(): Manifest;
  loadManifest(manifest: Manifest): this;
}

export class QuickMutationBuilder {
  readonly #engine: StaleZeroEngine;
  readonly #mutation: string;
  readonly #input: unknown;
  readonly #targets: TargetRef[] = [];
  readonly #affected: EntityRef[] = [];

  constructor(engine: StaleZeroEngine, mutation: string, input: unknown) {
    this.#engine = engine;
    this.#mutation = mutation;
    this.#input = input;
  }

  affects(...affected: EntityRef[]): this {
    this.#affected.push(...affected);
    return this;
  }

  target(targetRef: TargetRef): this {
    this.#targets.push(targetRef);
    return this;
  }

  redis(key: string, options?: Parameters<typeof redisTarget>[1]): this {
    return this.target(redisTarget(key, options));
  }

  redisPattern(pattern: string, options?: Parameters<typeof redisPatternTarget>[1]): this {
    return this.target(redisPatternTarget(pattern, options));
  }

  redux(path: string, options?: Parameters<typeof reduxTarget>[1]): this {
    return this.target(reduxTarget(path, options));
  }

  query(queryKey: unknown[], options?: Parameters<typeof queryTarget>[1]): this {
    return this.target(queryTarget(queryKey, options));
  }

  swr(key: string, options?: Parameters<typeof swrTarget>[1]): this {
    return this.target(swrTarget(key, options));
  }

  zustand(path: string, options?: Parameters<typeof zustandTarget>[1]): this {
    return this.target(zustandTarget(path, options));
  }

  nextTag(tag: string, options?: Parameters<typeof nextTagTarget>[1]): this {
    return this.target(nextTagTarget(tag, options));
  }

  nextPath(path: string, options?: Parameters<typeof nextPathTarget>[1]): this {
    return this.target(nextPathTarget(path, options));
  }

  socket(room: string, event?: string, options: Omit<Parameters<typeof socketTarget>[1], "event"> = {}): this {
    return this.target(socketTarget(room, { ...options, event }));
  }

  search(index: string, id: string, options?: Parameters<typeof searchTarget>[2]): this {
    return this.target(searchTarget(index, id, options));
  }

  http(url: string, options?: Parameters<typeof httpTarget>[1]): this {
    return this.target(httpTarget(url, options));
  }

  job(queue: string, payload: unknown, options?: Parameters<typeof jobTarget>[2]): this {
    return this.target(jobTarget(queue, payload, options));
  }

  custom(adapter: string, key: string, action: TargetAction = "custom", options: Omit<TargetRef, "adapter" | "key" | "action"> = {}): this {
    return this.target(customTarget(adapter, key, { ...options, action }));
  }

  preview(): Promise<Preview> {
    return this.#engine.previewRequest({
      mutation: this.#mutation,
      input: this.#input,
      explicitTargets: this.#targets,
      explicitAffected: this.#affected
    });
  }

  run(options?: ChangedOptions): Promise<Receipt> {
    return this.#engine.execute({
      mutation: this.#mutation,
      input: this.#input,
      explicitTargets: this.#targets,
      explicitAffected: this.#affected,
      options
    });
  }
}

type FlowStepDefinition = {
  name: string;
  run: (input: unknown) => MaybePromise<unknown>;
  options?: FlowStepOptions;
  parallel?: string;
};

export class StaleZeroFlowBuilder {
  readonly #engine: StaleZeroEngine;
  readonly #name: string;
  readonly #input: unknown;
  readonly #steps: FlowStepDefinition[] = [];
  readonly #completed = new Set<string>();
  #changedMutation?: string;

  constructor(engine: StaleZeroEngine, name: string, input: unknown) {
    this.#engine = engine;
    this.#name = name;
    this.#input = input;
  }

  step(name: string, run: (input: unknown) => MaybePromise<unknown>, options: FlowStepOptions = {}): this {
    this.#steps.push({ name, run, options });
    return this;
  }

  optional(name: string, run: (input: unknown) => MaybePromise<unknown>, options: FlowStepOptions = {}): this {
    return this.step(name, run, { ...options, optional: true });
  }

  parallel(
    name: string,
    steps: Array<{ name: string; run: (input: unknown) => MaybePromise<unknown>; options?: FlowStepOptions }>
  ): this {
    for (const step of steps) {
      this.#steps.push({ name: step.name, run: step.run, options: step.options, parallel: name });
    }
    return this;
  }

  changed(name = this.#name): this {
    this.#changedMutation = name;
    return this;
  }

  async run(options: ChangedOptions = {}): Promise<FlowResult> {
    const id = options.idempotencyKey ?? createId("flow");
    const receipts: FlowStepReceipt[] = [];
    let failed = false;

    const groups = new Map<string, FlowStepDefinition[]>();
    for (const step of this.#steps) {
      const group = step.parallel ?? `step:${step.name}:${receipts.length}`;
      groups.set(group, [...(groups.get(group) ?? []), step]);
    }

    for (const [group, steps] of groups) {
      if (steps.length > 1 || !group.startsWith("step:")) {
        const parallelResults = await Promise.all(steps.map((step) => this.#runStep(id, step)));
        receipts.push(...parallelResults);
        failed ||= parallelResults.some((step) => step.status === "failed");
      } else {
        const only = steps[0];
        if (only) {
          const result = await this.#runStep(id, only);
          receipts.push(result);
          failed ||= result.status === "failed";
        }
      }
      if (failed) {
        break;
      }
    }

    const status = failed ? "failed" : "success";
    const flow = { id, name: this.#name, status, steps: receipts };
    const receipt =
      !failed && this.#changedMutation
        ? await this.#engine.execute({
            mutation: this.#changedMutation,
            input: this.#input,
            options: {
              ...options,
              idempotencyKey: `${id}:changed`,
              source: options.source ?? "flow"
            }
          })
        : undefined;

    if (receipt) {
      Object.assign(receipt, { flow });
    }

    return {
      id,
      name: this.#name,
      status,
      steps: receipts,
      receipt,
      toJSON: () => ({
        id,
        name: this.#name,
        status,
        steps: [...receipts],
        receipt: receipt?.toJSON()
      }),
      toText: () =>
        [
          `Flow: ${this.#name}`,
          "",
          ...receipts.map((step) => `- ${step.status} ${step.name} (${step.durationMs}ms)`),
          "",
          `Status: ${status}`
        ].join("\n")
    };
  }

  async #runStep(flowId: string, step: FlowStepDefinition): Promise<FlowStepReceipt> {
    const id = step.options?.idempotencyKey ?? `${flowId}:${step.name}`;
    if (step.options?.skipIfCompleted && this.#completed.has(id)) {
      return { id, name: step.name, status: "skipped", durationMs: 0, attempts: 0, optional: step.options.optional, parallel: step.parallel };
    }

    const maxAttempts = Math.max(1, (step.options?.retry ?? 0) + 1);
    const started = now();
    let attempts = 0;
    let lastError: unknown;

    while (attempts < maxAttempts) {
      attempts += 1;
      try {
        const task = () => step.run(this.#input);
        if (step.options?.timeoutMs) {
          await withTimeout(task, step.options.timeoutMs, `flow step ${step.name}`);
        } else {
          await task();
        }
        this.#completed.add(id);
        return {
          id,
          name: step.name,
          status: "success",
          durationMs: now() - started,
          attempts,
          optional: step.options?.optional,
          parallel: step.parallel
        };
      } catch (error) {
        lastError = error;
      }
    }

    await step.options?.compensate?.();
    if (step.options?.optional) {
      return {
        id,
        name: step.name,
        status: "skipped",
        durationMs: now() - started,
        attempts,
        optional: true,
        parallel: step.parallel,
        error: serializeError(lastError).message
      };
    }
    return {
      id,
      name: step.name,
      status: "failed",
      durationMs: now() - started,
      attempts,
      optional: step.options?.optional,
      parallel: step.parallel,
      error: serializeError(lastError).message
    };
  }
}

export class StaleZeroResourceBuilder implements ResourceBuilderApi {
  readonly #engine: StaleZeroEngine;
  readonly name: string;
  readonly definition: ResourceDefinition;

  constructor(engine: StaleZeroEngine, name: string, definition: ResourceDefinition) {
    this.#engine = engine;
    this.name = name;
    this.definition = definition;
  }

  async use(recipe: ResourceRecipe): Promise<ResourceBuilderApi> {
    if (typeof recipe === "function") {
      await recipe(this);
    } else {
      await recipe.install(this);
    }
    return this;
  }

  async preview(recipe: ResourceRecipe): Promise<string> {
    const clone = new StaleZeroResourceBuilder(this.#engine, this.name, this.definition);
    await clone.use(recipe);
    return this.eject(recipe);
  }

  eject(recipe: ResourceRecipe): string {
    const name = typeof recipe === "function" ? "custom-resource-recipe" : recipe.name ?? "resource-recipe";
    return [
      `stale.resource("${this.name}", ${JSON.stringify(this.definition, null, 2)})`,
      `  .use(${name});`
    ].join("\n");
  }

  installStandard(options: AutopilotRecipeOptions = {}): void {
    const idField = typeof this.definition.id === "string" ? this.definition.id : `${this.name.toLowerCase()}Id`;
    const entityName = this.name;
    const owner = options.owner ?? this.definition.owner;
    const idFrom = (input: Record<string, unknown>): string => String(input[idField] ?? input.id ?? "unknown");
    const mutations = [`${entityName}Created`, `${entityName}Updated`, `${entityName}Deleted`, `${entityName}RoleChanged`];

    for (const mutation of mutations) {
      this.#engine.mutation(mutation, {
        owner,
        affects: (input: Record<string, unknown>) => [entity(entityName, idFrom(input))],
        fields: (input: Record<string, unknown>) => Object.keys((input.after as Record<string, unknown> | undefined) ?? input),
        routes: {
          name: [`${mutation}:redis`, `${mutation}:query`, `${mutation}:search`],
          email: [`${mutation}:redis`, `${mutation}:query`, `${mutation}:search`],
          avatarUrl: [`${mutation}:redis`, `${mutation}:query`],
          role: [`${mutation}:redis`, `${mutation}:query`, `${mutation}:socket`]
        }
      });
      if (options.redis !== false) {
        this.#engine.mirror(`${mutation}:redis`, {
          when: mutation,
          owner,
          target: (input: Record<string, unknown>) => redisTarget(`${entityName.toLowerCase()}:${idFrom(input)}`, { owner })
        });
      }
      if (options.reactQuery !== false) {
        this.#engine.mirror(`${mutation}:query`, {
          when: mutation,
          owner,
          target: (input: Record<string, unknown>) => queryTarget([entityName.toLowerCase(), idFrom(input)], { owner })
        });
      }
      if (options.nextTag !== false) {
        this.#engine.mirror(`${mutation}:next`, {
          when: mutation,
          owner,
          target: (input: Record<string, unknown>) => nextTagTarget(`${entityName.toLowerCase()}:${idFrom(input)}`, { owner })
        });
      }
      if (options.socket !== false) {
        this.#engine.mirror(`${mutation}:socket`, {
          when: mutation,
          owner,
          target: (input: Record<string, unknown>) => socketTarget(`${entityName.toLowerCase()}:${idFrom(input)}`, { owner, event: `${entityName.toLowerCase()}.changed` })
        });
      }
      if (options.search) {
        this.#engine.mirror(`${mutation}:search`, {
          when: mutation,
          owner,
          target: (input: Record<string, unknown>) => searchTarget(options.searchIndex ?? `${entityName.toLowerCase()}s`, idFrom(input), { owner })
        });
      }
    }

    if (options.tenantGuard && this.definition.tenant) {
      const tenant = this.definition.tenant;
      this.#engine.security({ requireActor: true, requireTenantBoundary: true, blockUnsafeTargets: true });
      this.#engine.tenant({
        actorTenant: ({ actor }) => (isRecord(actor) ? String(actor.tenantId ?? "") : undefined),
        inputTenant: ({ input }) => {
          const record = isRecord(input) ? input : {};
          const value = typeof tenant === "function" ? tenant(record) : record[tenant];
          return value === undefined ? undefined : String(value);
        },
        blockCrossTenant: true
      });
    }
  }
}

export class StaleZeroEngine {
  readonly #config: ResolvedConfig;
  readonly #adapters = new Map<string, Adapter>();
  readonly #mutations = new Map<string, MutationDefinition>();
  readonly #mirrors = new Map<string, MirrorRecord>();
  readonly #commands = new Map<string, CommandRecord>();
  readonly #sources = new Set<string>();
  readonly #recentTargets = new Map<string, number>();
  readonly #seenEvents = new Map<string, number>();
  readonly #circuits = new Map<string, CircuitState>();
  readonly #rateBuckets = new Map<string, number[]>();
  readonly #namedRateBuckets = new Map<string, number[]>();
  readonly #sloHistory = new Map<string, Array<{ timestamp: number; failed: boolean }>>();
  readonly #buses: EventBus[] = [];
  readonly #unsubscribeBuses: Array<() => MaybePromise<void> | void> = [];
  readonly #sloConfigs = new Map<string, SloConfig>();
  readonly #approvalGates = new Map<string, ApprovalConfig>();
  readonly #rateLimitConfigs = new Map<string, RateLimitConfig>();
  readonly #sandboxConfigs = new Map<string, SandboxConfig>();
  readonly #undoables = new Map<string, UndoableDefinition>();
  readonly #emittedContracts: ServiceContract[] = [];
  readonly #consumedContracts: ServiceContract[] = [];
  readonly #schemaVersions = new Map<string, ServiceContract["schema"]>();
  readonly #driftProbes: DriftProbe[] = [];
  readonly #lintRules: GraphLintRule[] = [];
  readonly #freshnessBudgets = new Map<string, FreshnessBudget>();
  readonly #profiles = new Map<string, ConsistencyProfile>();
  readonly #rollouts = new Map<string, RolloutConfig>();
  readonly #shadows = new Map<string, ShadowConfig>();
  readonly #notifyConfigs: NotifyConfig[] = [];
  #chaosConfig?: ChaosConfig;
  readonly #blackboxLog: BlackboxEntry[] = [];
  #receiptStore: ReceiptStore = new MemoryReceiptStore();
  #manifest?: Manifest;
  #devtoolsOptions: StudioOptions = {};
  #coalesceConfig?: CoalesceConfig;
  #securityConfig?: SecurityConfig;
  #tenantConfig?: TenantConfig;
  #riskConfig?: RiskConfig;
  #blackboxConfig: BlackboxConfig = { enabled: false, retainLast: 1000, redact: true };
  readonly drift: DriftApi = {
    use: (probe) => {
      this.#driftProbes.push(probe);
      return this.drift;
    },
    scan: (type, id) => this.#scanDrift(type, id),
    schedule: (type, id, intervalMs, handler) => {
      const timer = setInterval(() => {
        void this.#scanDrift(type, id).then((report) => handler?.(report));
      }, intervalMs);
      return () => clearInterval(timer);
    }
  };

  readonly receipts: ReceiptsApi = {
    list: async (options) => this.#receiptStore.list(options),
    export: async (options) => this.exportReceipts(options)
  };

  constructor(config: StaleZeroConfig = {}) {
    this.#config = {
      app: config.app,
      environment: config.environment,
      source: config.source,
      execution: {
        defaultConsistency: "best-effort",
        timeoutMs: 3000,
        retries: 0,
        concurrency: 10,
        dedupeWindowMs: 0,
        payloadLimitBytes: Number.POSITIVE_INFINITY,
        warnOnMemoryReceiptStoreInProduction: true,
        rateLimitPerSecond: Number.POSITIVE_INFINITY,
        ...config.execution,
        retry: {
          backoffMs: 0,
          maxBackoffMs: 1000,
          jitter: false,
          ...config.execution?.retry
        },
        circuitBreaker: {
          enabled: false,
          failureThreshold: 5,
          cooldownMs: 30_000,
          ...config.execution?.circuitBreaker
        }
      },
      distributed: {
        enabled: false,
        ignoreSelf: true,
        maxHops: 3,
        dedupeTtlMs: 60_000,
        ...config.distributed
      },
      receipts: {
        enabled: true,
        sampleRate: 1,
        redact: ["password", "token", "secret", "authorization", "cookie", "apiKey", "email"],
        redactWith: undefined,
        secretSafe: true,
        retentionMs: undefined,
        maxEntries: undefined,
        ...config.receipts
      },
      hooks: config.hooks
    };

    if (
      this.#config.environment === "production" &&
      this.#config.execution.warnOnMemoryReceiptStoreInProduction &&
      this.#config.receipts.enabled
    ) {
      console.warn("StaleZero is using the in-memory receipt store in production. Register a durable store with useReceiptStore().");
    }
  }

  use(adapter: Adapter): this {
    this.#adapters.set(adapter.name, adapter);
    return this;
  }

  useBus(bus: EventBus): this {
    this.#buses.push(bus);
    void Promise.resolve(bus.subscribe((event) => this.#handleEvent(event))).then((unsubscribe) => {
      this.#unsubscribeBuses.push(unsubscribe);
    });
    return this;
  }

  useReceiptStore(store: ReceiptStore): this {
    this.#receiptStore = store;
    return this;
  }

  source(name: string): this {
    this.#sources.add(name);
    return this;
  }

  mutation<Input = unknown>(name: string, definition: MutationDefinition<Input>): StaleZero {
    this.#mutations.set(name, definition as MutationDefinition);
    return this as unknown as StaleZero;
  }

  mirror<Input = unknown>(name: string, definition: MirrorDefinition<Input>): this {
    this.#mirrors.set(name, { name, definition: definition as MirrorDefinition });
    return this;
  }

  view<Input = unknown>(name: string, definition: MirrorDefinition<Input>): this {
    return this.mirror(name, definition);
  }

  command<Input = unknown, Output = unknown>(name: string, definition: CommandDefinition<Input, Output>): this {
    this.#commands.set(name, { name, definition: definition as CommandDefinition });
    return this;
  }

  changed(name: string, input: unknown, options: ChangedOptions = {}): Promise<Receipt> {
    return this.execute({ mutation: name, input, options });
  }

  changedMany(
    changes: Array<{ mutation: string; input: unknown; options?: ChangedOptions }>,
    options: ChangedOptions = {}
  ): Promise<Receipt[]> {
    return mapLimit(changes, this.#config.execution.concurrency, (change) =>
      this.execute({
        mutation: change.mutation,
        input: change.input,
        options: { ...options, ...change.options }
      })
    );
  }

  mutate(name: string, input: unknown): QuickMutationBuilder {
    return new QuickMutationBuilder(this, name, input);
  }

  async run(name: string, input: unknown, options: ChangedOptions = {}): Promise<{ output: unknown; receipt: Receipt }> {
    const command = this.#commands.get(name);
    if (!command) {
      throw new Error(`No command registered for ${name}`);
    }

    const parsed = await this.#parseInput(command.definition.schema, input);
    const output = await command.definition.run({ input: parsed, context: { traceId: options.traceId, source: options.source } });
    const affected = command.definition.affects ? await command.definition.affects({ input: parsed, output }) : undefined;
    const receipt = await this.execute({
      mutation: command.definition.changed ?? name,
      input: parsed,
      explicitAffected: affected,
      options
    });
    return { output, receipt };
  }

  preview(name: string, input: unknown): Promise<Preview> {
    return this.previewRequest({ mutation: name, input });
  }

  async snapshot(name: string, input: unknown): Promise<MutationSnapshot> {
    const preview = await this.preview(name, input);
    const data: MutationSnapshotData = {
      version: 1,
      mutation: name,
      input: preview.input,
      affected: preview.affected,
      targets: preview.targets,
      risk: preview.risk ?? this.#assessRisk(name, preview.input, preview.targets),
      createdAt: new Date().toISOString()
    };

    return {
      ...data,
      toJSON: () => ({ ...data, affected: [...data.affected], targets: [...data.targets], risk: { ...data.risk } }),
      toText: () => snapshotToText(data)
    };
  }

  async compareSnapshots(
    left: MutationSnapshot | MutationSnapshotData,
    right: MutationSnapshot | MutationSnapshotData
  ): Promise<SnapshotDiff> {
    const leftKeys = new Set(left.targets.map(targetSignature));
    const rightKeys = new Set(right.targets.map(targetSignature));
    const added = [...rightKeys].filter((key) => !leftKeys.has(key)).sort();
    const removed = [...leftKeys].filter((key) => !rightKeys.has(key)).sort();
    const unchanged = [...rightKeys].filter((key) => leftKeys.has(key)).sort();
    const risk = diffRisk(added.length, removed.length, right.risk);
    const data = {
      mutation: right.mutation,
      added,
      removed,
      unchanged,
      risk
    };

    return {
      ...data,
      toJSON: () => ({ ...data, added: [...added], removed: [...removed], unchanged: [...unchanged] }),
      toText: () => snapshotDiffToText(data)
    };
  }

  async replay(receiptOrId: string | Receipt, options: ReplayOptions = {}): Promise<ReplayResult> {
    const original = typeof receiptOrId === "string" ? await this.receipt(receiptOrId) : receiptOrId;
    if (!original) {
      throw new Error(`No receipt found for replay`);
    }

    const mode = options.mode ?? "sandbox";
    const failedTargets = new Set(
      original.results.filter((result) => result.status === "failed").map((result) => targetSignature(result.target))
    );
    const currentTargets = options.currentGraph
      ? (await this.preview(original.mutation, original.input)).targets
      : original.targets;
    const filteredTargets = currentTargets.filter((targetRef) => {
      if (options.target && targetRef.key !== options.target && targetSignature(targetRef) !== options.target && targetRef.label !== options.target) {
        return false;
      }
      if (options.adapter && targetRef.adapter !== options.adapter) {
        return false;
      }
      if (options.failedOnly && !failedTargets.has(targetSignature(targetRef))) {
        return false;
      }
      if (options.requiredOnly && targetRef.required === false) {
        return false;
      }
      if (options.safeOnly && !isSafeReplayTarget(targetRef)) {
        return false;
      }
      return true;
    });
    const safeTargets = filteredTargets.filter(isSafeReplayTarget);
    const executable = mode === "force" ? filteredTargets : mode === "safe-replay" ? safeTargets : [];
    const skipped = currentTargets.filter((targetRef) => !executable.includes(targetRef));
    const receipt =
      mode === "sandbox" || mode === "dry-run"
        ? createReceipt({
            id: createId("replay"),
            mutation: original.mutation,
            payload: this.#redact(original.input),
            affected: original.affected,
            targets: filteredTargets,
            results: filteredTargets.map((targetRef) => this.#result(targetRef, "skipped", 0, 0, undefined, "replay sandbox")),
            status: "dry-run",
            durationMs: 0,
            timestamp: now(),
            app: this.#config.app,
            traceId: original.traceId
          })
        : await this.execute({
            mutation: original.mutation,
            input: original.input,
            explicitAffected: original.affected,
            explicitTargets: executable,
            options: { consistency: options.consistency, traceId: original.traceId, source: "replay" }
          });

    return {
      mode,
      receipt,
      executed: executable,
      skipped,
      toText: () =>
        [
          `Replay: ${original.mutation}`,
          "",
          executable.length ? "Executed:" : "Would execute:",
          ...(filteredTargets.length
            ? filteredTargets.map((targetRef) => `- ${targetRef.adapter} ${targetRef.key} ${targetRef.action}`)
            : ["- no targets"]),
          "",
          "Skipped:",
          ...(skipped.length ? skipped.map((targetRef) => `- ${targetRef.adapter} ${targetRef.key}`) : ["- none"]),
          "",
          `Mode: ${mode}`
        ].join("\n")
    };
  }

  async prove(receiptOrId: string | Receipt, options: { timeoutMs?: number; retries?: number; ci?: boolean } = {}): Promise<Receipt> {
    const original = await this.#resolveReceipt(receiptOrId);
    const context = await this.#context(original.mutation, original.input, original.affected, {
      dryRun: false,
      traceId: original.traceId,
      source: "proof",
      id: createId("proof")
    });
    const proofs = await this.#proveTargets(original.targets, context, options.timeoutMs, options.retries);
    const receipt = createReceipt({
      id: context.id,
      mutation: original.mutation,
      payload: this.#redact(original.input),
      affected: original.affected,
      targets: original.targets,
      results: original.targets.map((targetRef) => this.#result(targetRef, "skipped", 0, 0, undefined, "proof only")),
      status: proofRequiredFailure(proofs) ? "failed" : "dry-run",
      durationMs: proofs.reduce((sum, proof) => sum + proof.durationMs, 0),
      timestamp: now(),
      app: this.#config.app,
      traceId: original.traceId,
      owner: original.owner,
      risk: original.risk,
      proofs,
      proofStatus: proofStatusFrom(proofs),
      cost: original.cost
    });
    if (this.#shouldStoreReceipt()) {
      await this.#receiptStore.save(receipt);
    }
    if (options.ci && proofRequiredFailure(proofs)) {
      throw new StaleZeroExecutionError(receipt);
    }
    return receipt;
  }

  async lint(options: { ci?: boolean; rules?: GraphLintRule[]; autofix?: boolean } = {}): Promise<GraphLintReport> {
    const manifest = this.generateManifest();
    const context = {
      manifest,
      mutations: Object.fromEntries(this.#mutations.entries()),
      adapters: [...this.#adapters.keys()]
    };
    const findings = [
      ...builtInLintFindings(manifest, this.#mutations, this.#mirrors, this.#adapters, this.#approvalGates),
      ...(await asyncFlatMap([...this.#lintRules, ...(options.rules ?? [])], (rule) => rule.run(context)))
    ];
    const failed = findings.filter((finding) => finding.severity === "error").length;
    const passed = Math.max(0, 12 - failed);
    const report = {
      passed,
      failed,
      findings,
      toText: () =>
        [
          "StaleZero Graph Lint",
          "",
          ...findings.map((finding) => `${finding.severity === "error" ? "fail" : finding.severity} ${finding.subject} ${finding.message}`),
          "",
          `${passed} passed, ${failed} failed`
        ].join("\n")
    };
    if (options.ci && failed > 0) {
      throw new Error(report.toText());
    }
    return report;
  }

  async contract(name: string, definition: MutationContract): Promise<MutationContractResult> {
    const snapshot = await this.snapshot(name, definition.input);
    const failures: string[] = [];
    const affectedKeys = new Set(snapshot.affected.map((ref) => `${ref.type}:${ref.id}`));
    for (const expected of definition.affects ?? []) {
      const key = Array.isArray(expected) ? `${expected[0]}:${expected[1]}` : `${expected.type}:${expected.id}`;
      if (!affectedKeys.has(key)) {
        failures.push(`Expected ${name} to affect ${key}`);
      }
    }

    const targetKeys = new Set(snapshot.targets.map((targetRef) => `${targetRef.adapter}:${targetRef.key}`));
    const targetSignatures = new Set(snapshot.targets.map(targetSignature));
    for (const expected of definition.invalidates ?? []) {
      if (!targetKeys.has(expected) && !targetSignatures.has(expected)) {
        failures.push(`Expected ${name} to invalidate ${expected}`);
      }
    }
    for (const expected of definition.notInvalidates ?? []) {
      if (targetKeys.has(expected) || targetSignatures.has(expected)) {
        failures.push(`Expected ${name} not to invalidate ${expected}`);
      }
    }
    if (definition.maxRisk && compareRisk(snapshot.risk.level, definition.maxRisk) > 0) {
      failures.push(`Expected risk at most ${definition.maxRisk}, got ${snapshot.risk.level}`);
    }

    return { mutation: name, passed: failures.length === 0, failures };
  }

  flow(name: string, input: unknown): StaleZeroFlowBuilder {
    return new StaleZeroFlowBuilder(this, name, input);
  }

  undoable<Input = unknown>(name: string, definition: UndoableDefinition<Input>): this {
    this.#undoables.set(name, definition as UndoableDefinition);
    return this;
  }

  async previewUndo(receiptOrId: string | Receipt, options: { actor?: unknown } = {}): Promise<UndoPreview> {
    const receipt = await this.#resolveReceipt(receiptOrId);
    const definition = this.#undoables.get(receipt.mutation);
    const reasons: string[] = [];
    if (!definition) {
      reasons.push(`No undo handler registered for ${receipt.mutation}`);
    }
    if (definition?.windowMs && now() - receipt.timestamp > definition.windowMs) {
      reasons.push("Undo window has expired");
    }
    if (definition?.authorize && !(await definition.authorize({ actor: options.actor, receipt }))) {
      reasons.push("Actor is not authorized to undo this mutation");
    }
    const targets = definition?.targets
      ? await definition.targets({ receipt, input: receipt.input })
      : receipt.targets.filter(isSafeReplayTarget).map((targetRef) => ({ ...targetRef, required: false }));
    return {
      receiptId: receipt.id,
      mutation: receipt.mutation,
      allowed: reasons.length === 0,
      reasons,
      targets,
      toText: () =>
        [
          `Undo preview: ${receipt.mutation}`,
          "",
          reasons.length ? "Blocked:" : "Will undo:",
          ...(reasons.length ? reasons.map((reason) => `- ${reason}`) : targets.map((targetRef) => `- ${targetRef.adapter} ${targetRef.key}`))
        ].join("\n")
    };
  }

  async undo(
    receiptOrId: string | Receipt,
    options: { actor?: unknown; approvalToken?: string; consistency?: ConsistencyMode } = {}
  ): Promise<UndoResult> {
    const receipt = await this.#resolveReceipt(receiptOrId);
    const preview = await this.previewUndo(receipt, { actor: options.actor });
    if (!preview.allowed) {
      return {
        receiptId: receipt.id,
        mutation: receipt.mutation,
        status: "blocked",
        preview,
        toText: () => [`Undo blocked: ${receipt.mutation}`, ...preview.reasons.map((reason) => `- ${reason}`)].join("\n")
      };
    }

    try {
      const definition = this.#undoables.get(receipt.mutation);
      await definition?.undo({ input: receipt.input, receipt, actor: options.actor });
      const undoReceipt = await this.execute({
        mutation: definition?.changed ?? `${receipt.mutation}Undone`,
        input: receipt.input,
        explicitAffected: receipt.affected,
        explicitTargets: preview.targets,
        options: {
          consistency: options.consistency,
          source: "undo",
          approvalToken: options.approvalToken,
          idempotencyKey: createId("undo")
        }
      });
      Object.assign(undoReceipt, {
        undo: {
          originalReceiptId: receipt.id,
          status: "success",
          approver: options.approvalToken
        }
      });
      return {
        receiptId: receipt.id,
        mutation: receipt.mutation,
        status: "success",
        preview,
        receipt: undoReceipt,
        toText: () => [`Undo: ${receipt.mutation}`, "", `Status: success`, `Receipt: ${undoReceipt.id}`].join("\n")
      };
    } catch (error) {
      return {
        receiptId: receipt.id,
        mutation: receipt.mutation,
        status: "failed",
        preview,
        toText: () => [`Undo failed: ${receipt.mutation}`, serializeError(error).message].join("\n")
      };
    }
  }

  timeMachine(): TimeMachineApi {
    return {
      timeline: async (options) => this.#receiptStore.list(options),
      search: async (options) => {
        const receipts = await this.#receiptStore.list({ limit: options.limit ?? 1000, mutation: options.mutation });
        return receipts.filter((receipt) => {
          if (options.entity && !receipt.affected.some((ref) => `${ref.type}:${ref.id}`.includes(options.entity ?? ""))) {
            return false;
          }
          if (options.target && !receipt.targets.some((targetRef) => `${targetRef.adapter}:${targetRef.key}`.includes(options.target ?? ""))) {
            return false;
          }
          if (options.adapter && !receipt.targets.some((targetRef) => targetRef.adapter === options.adapter)) {
            return false;
          }
          if (options.actor && JSON.stringify(receipt.input).includes(options.actor) === false) {
            return false;
          }
          return true;
        });
      },
      compareReceiptToGraph: async (receiptOrId) => {
        const receipt = await this.#resolveReceipt(receiptOrId);
        const current = await this.snapshot(receipt.mutation, receipt.input);
        return this.compareSnapshots(
          {
            version: 1,
            mutation: receipt.mutation,
            input: receipt.input,
            affected: receipt.affected,
            targets: receipt.targets,
            risk: receipt.risk ?? this.#assessRisk(receipt.mutation, receipt.input, receipt.targets),
            createdAt: new Date(receipt.timestamp).toISOString()
          },
          current
        );
      },
      incident: (receipt) => this.incident(receipt)
    };
  }

  async impact(name: string, input: unknown): Promise<RiskResult> {
    const preview = await this.preview(name, input);
    return preview.risk ?? this.#assessRisk(name, preview.input, preview.targets);
  }

  async playbook(receiptOrId: string | Receipt): Promise<Playbook> {
    const receipt = await this.#resolveReceipt(receiptOrId);
    const failed = receipt.results.filter((result) => result.status === "failed");
    const owner = receipt.owner ?? this.#mutations.get(receipt.mutation)?.owner;
    const steps =
      failed.length === 0
        ? ["Review the receipt timeline", "Compare the receipt with the current graph", "Keep the receipt for the release record"]
        : failed.flatMap((result) => [
            `Check ${result.adapter} health`,
            `Retry target ${result.adapter}:${result.key} in safe-replay mode`,
            `Verify ${result.adapter}:${result.key} with drift scan`,
            `Escalate to ${result.target.owner ?? owner ?? "the owning team"} if it fails again`
          ]);
    return {
      receiptId: receipt.id,
      mutation: receipt.mutation,
      owner,
      steps,
      toText: () => [`Playbook: ${receipt.mutation}`, "", ...steps.map((step, index) => `${index + 1}. ${step}`)].join("\n")
    };
  }

  emits(event: string, schema: ServiceContract["schema"], options: { service?: string } = {}): this {
    const contract = { service: options.service ?? this.#config.app ?? "service", event, schema };
    this.#emittedContracts.push(contract);
    this.#schemaVersions.set(event, schema);
    return this;
  }

  consumes(event: string, schema: ServiceContract["schema"], options: { service?: string } = {}): this {
    const contract = { service: options.service ?? this.#config.app ?? "service", event, schema };
    this.#consumedContracts.push(contract);
    this.#schemaVersions.set(event, schema);
    return this;
  }

  contractCheck(): ServiceContractReport {
    return this.#contractReport();
  }

  schemaRegistry(): SchemaRegistryApi {
    return {
      register: (event, schema) => {
        this.#schemaVersions.set(event, schema);
        return this.schemaRegistry();
      },
      diff: (event, next) => schemaDiff(event, this.#schemaVersions.get(event), next),
      check: () => this.#contractReport(),
      docs: () => this.#schemaDocs(),
      matrix: () => this.#schemaMatrix()
    };
  }

  async canary(name: string, input: unknown): Promise<CanaryResult> {
    const receipt = await this.changed(name, input, { dryRun: true, source: "canary", prove: true });
    const warnings = [
      ...(!this.#mutations.get(name)?.schema ? ["mutation has no schema"] : []),
      ...receipt.targets.filter((targetRef) => targetRef.adapter === "http").map((targetRef) => `HTTP target ${targetRef.key} should be allowlisted`),
      ...receipt.targets.filter((targetRef) => targetRef.key.includes("*")).map((targetRef) => `wildcard target ${targetRef.key} needs sandbox rules`)
    ];
    const readinessScore = Math.max(0, 100 - warnings.length * 15 - receipt.risk!.score / 2);
    return {
      mutation: name,
      receipt,
      readinessScore,
      warnings,
      toText: () =>
        [
          `Canary: ${name}`,
          "",
          `Readiness: ${Math.round(readinessScore)}/100`,
          "",
          "Warnings:",
          ...(warnings.length ? warnings.map((warning) => `- ${warning}`) : ["- none"])
        ].join("\n")
    };
  }

  marketplace(): MarketplaceEntry[] {
    return [
      { name: "@stalezero/core", kind: "template", stability: "stable", verified: true, securityScore: 98, compatibility: ["node>=20", "esm"] },
      { name: "@stalezero/pack-auth", kind: "pack", stability: "beta", verified: true, securityScore: 92, compatibility: ["core"] },
      { name: "@stalezero/pack-commerce", kind: "pack", stability: "beta", verified: true, securityScore: 92, compatibility: ["core"] },
      { name: "@stalezero/pack-saas", kind: "pack", stability: "beta", verified: true, securityScore: 91, compatibility: ["core"] },
      { name: "@stalezero/adapter-redis", kind: "adapter", stability: "beta", verified: true, securityScore: 90, compatibility: ["redis"] },
      { name: "@stalezero/adapter-http", kind: "adapter", stability: "beta", verified: true, securityScore: 88, compatibility: ["fetch"] },
      { name: "@stalezero/bus-redis-streams", kind: "bus", stability: "experimental", verified: false, securityScore: 82, compatibility: ["redis"] }
    ];
  }

  async incident(receiptOrId: string | Receipt): Promise<string> {
    const receipt = await this.#resolveReceipt(receiptOrId);
    const failed = receipt.results.filter((result) => result.status === "failed");
    const playbook = await this.playbook(receipt);
    return [
      `# Incident: ${receipt.mutation} ${receipt.status}`,
      "",
      "## Summary",
      failed.length
        ? `${receipt.mutation} completed with ${failed.length} failed target${failed.length === 1 ? "" : "s"}.`
        : `${receipt.mutation} completed without failed targets.`,
      "",
      "## Impact",
      failed.length
        ? failed.map((result) => `- ${result.adapter}:${result.key} may still be stale`).join("\n")
        : "- No stale targets detected in the receipt.",
      "",
      "## Timeline",
      `- ${new Date(receipt.timestamp).toISOString()} mutation started`,
      ...receipt.results.map((result) => `- ${result.status} ${result.adapter}:${result.key} (${result.durationMs}ms)`),
      "",
      "## Recommended action",
      ...playbook.steps.map((step) => `- ${step}`)
    ].join("\n");
  }

  async cost(name: string, input: unknown): Promise<CostReport> {
    const preview = await this.preview(name, input);
    return estimateCost(preview.targets);
  }

  async explainStale(entityKey: string, options: { input?: unknown } = {}): Promise<ExplainStaleReport> {
    const [type = entityKey, id = ""] = entityKey.split(":");
    const receipts = await this.#receiptStore.list({ limit: 1000 });
    const lastReceipt = receipts.find((receipt) => receipt.affected.some((ref) => ref.type === type && ref.id === id));
    const candidateMutation = lastReceipt?.mutation ?? Object.keys(this.generateManifest().mutations).find((name) => name.includes(type));
    const expectedTargets = candidateMutation
      ? (await this.preview(candidateMutation, options.input ?? lastReceipt?.input ?? { [`${type.toLowerCase()}Id`]: id, id })).targets
      : [];
    const failed = lastReceipt?.results.filter((result) => result.status === "failed") ?? [];
    const executedSignatures = new Set(lastReceipt?.targets.map(targetSignature) ?? []);
    const findings = [
      ...expectedTargets.map((targetRef) => ({
        status: executedSignatures.has(targetSignature(targetRef)) ? "ok" as const : "missing" as const,
        message: `${targetRef.adapter}:${targetRef.key} ${executedSignatures.has(targetSignature(targetRef)) ? "was covered" : "is not in the last receipt"}`
      })),
      ...failed.map((result) => ({ status: "failed" as const, message: `${result.adapter}:${result.key} failed: ${result.error?.message ?? "unknown error"}` }))
    ];
    const likelyCause = failed[0]
      ? `${failed[0].adapter}:${failed[0].key} failed during the last relevant mutation.`
      : findings.some((finding) => finding.status === "missing")
        ? "The current graph expects a target that the last receipt did not include."
        : "No obvious stale cause found from receipt history.";
    return {
      entity: entityKey,
      lastReceipt,
      expectedTargets,
      findings,
      likelyCause,
      suggestedFix: failed[0] ? `Run stalezero replay ${lastReceipt?.id} --target=${targetSignature(failed[0].target)} --safe-replay` : "Compare the mutation graph and add the missing target.",
      toText: () =>
        [
          `Possible stale bug: ${entityKey}`,
          "",
          "Last relevant mutation:",
          lastReceipt ? `- ${lastReceipt.mutation} at ${new Date(lastReceipt.timestamp).toISOString()}` : "- none",
          "",
          "Expected targets:",
          ...(expectedTargets.length ? expectedTargets.map((targetRef) => `- ${targetRef.adapter} ${targetRef.key}`) : ["- none found"]),
          "",
          "Findings:",
          ...(findings.length ? findings.map((finding) => `- ${finding.status} ${finding.message}`) : ["- no findings"]),
          "",
          `Likely cause: ${likelyCause}`,
          `Suggested fix: ${failed[0] ? `replay ${failed[0].adapter}:${failed[0].key}` : "review graph wiring"}`
        ].join("\n")
    };
  }

  async heatmap(options: { limit?: number; owner?: string } = {}): Promise<HeatmapReport> {
    const receipts = await this.#receiptStore.list({ limit: options.limit ?? 1000 });
    return heatmapFromReceipts(options.owner ? receipts.filter((receipt) => receipt.owner === options.owner) : receipts);
  }

  async optimizeCost(options: { limit?: number } = {}): Promise<OptimizationReport> {
    const receipts = await this.#receiptStore.list({ limit: options.limit ?? 1000 });
    const suggestions = optimizationSuggestions(receipts);
    return {
      suggestions,
      toText: () =>
        [
          "Optimization suggestions:",
          "",
          ...(suggestions.length
            ? suggestions.map((suggestion, index) => `${index + 1}. ${suggestion.title}\n   Suggestion: ${suggestion.suggestion}\n   Estimated reduction: ${suggestion.estimatedReduction}%`)
            : ["No obvious waste patterns found."])
        ].join("\n")
    };
  }

  freshness(name: string, budget: FreshnessBudget): this {
    this.#freshnessBudgets.set(name, budget);
    return this;
  }

  profile(name: string, config: ConsistencyProfile): this {
    this.#profiles.set(name, config);
    return this;
  }

  rollout(name: string, config: RolloutConfig): this {
    this.#rollouts.set(name, config);
    return this;
  }

  shadow(name: string, config: ShadowConfig): this {
    this.#shadows.set(name, config);
    return this;
  }

  ownershipMap(): OwnershipMap {
    const map: OwnershipMap = {};
    for (const [name, definition] of this.#mutations) {
      const owner = definition.owner ?? "unowned";
      map[owner] = map[owner] ?? { mutations: [], targets: [] };
      map[owner].mutations.push(name);
    }
    for (const [name, mirror] of this.#mirrors) {
      const owner = mirror.definition.owner ?? "unowned";
      map[owner] = map[owner] ?? { mutations: [], targets: [] };
      map[owner].targets.push(name);
    }
    return map;
  }

  async score(): Promise<ProjectScore> {
    const lint = await this.lint();
    const strengths: string[] = [];
    const missing: string[] = [];
    if (!lint.findings.some((finding) => finding.rule === "missing-schema")) strengths.push("all registered mutations have schemas");
    if (!lint.findings.some((finding) => finding.rule === "missing-owner")) strengths.push("mutation ownership is declared");
    if (this.#config.receipts.redact?.length) strengths.push("receipt redaction is enabled");
    for (const finding of lint.findings.filter((item) => item.severity === "error" || item.severity === "warn")) {
      missing.push(finding.message);
    }
    const score = Math.max(0, 100 - lint.findings.filter((item) => item.severity === "error").length * 15 - lint.findings.filter((item) => item.severity === "warn").length * 5);
    const grade = score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 60 ? "D" : "F";
    return {
      score,
      grade,
      strengths,
      missing,
      toText: () => [`StaleZero Project Score: ${score}/100`, "", "Strengths:", ...(strengths.length ? strengths.map((item) => `- ${item}`) : ["- add graph metadata"]), "", "Missing:", ...(missing.length ? missing.map((item) => `- ${item}`) : ["- nothing major"])].join("\n")
    };
  }

  async badge(): Promise<BadgeResult> {
    const score = await this.score();
    const color = score.score >= 90 ? "brightgreen" : score.score >= 80 ? "green" : score.score >= 70 ? "yellow" : "orange";
    const label = "StaleZero Score";
    const message = `${score.score}/100 ${score.grade}`;
    return {
      label,
      message,
      color,
      svg: badgeSvg(label, message, color)
    };
  }

  chaos(config: ChaosConfig): this {
    this.#chaosConfig = config;
    return this;
  }

  browserHelper(options: BrowserHelperOptions = {}): string {
    const warnAfterMs = options.warnAfterMs ?? 2000;
    return `(() => {
  const warnAfterMs = ${warnAfterMs};
  const receipts = [];
  globalThis.__STALEZERO_BROWSER_HELPER__ = {
    receipt(receipt) {
      receipts.push(receipt);
      setTimeout(() => {
        for (const target of receipt.targets || []) {
          if (target.adapter === "query" || target.adapter === "swr" || target.adapter === "redux" || target.adapter === "zustand") {
            console.warn("[StaleZero] check freshness for", target.key, "after", receipt.mutation);
          }
        }
      }, warnAfterMs);
    },
    receipts
  };
})();`;
  }

  async humanReceipt(receiptOrId: string | Receipt): Promise<HumanReceipt> {
    const receipt = await this.#resolveReceipt(receiptOrId);
    const actor = isRecord(receipt.input) && receipt.input.actor ? String(receipt.input.actor) : "Someone";
    const affected = receipt.affected.map((ref) => `${ref.type} ${ref.id}`).join(", ") || receipt.mutation;
    const targetSummary = uniqueStrings(receipt.targets.map((targetRef) => humanTarget(targetRef))).join(", ") || "no external targets";
    const summary = `${actor} ran ${receipt.mutation} for ${affected}. StaleZero refreshed ${targetSummary}. ${receipt.status === "success" ? "Everything completed" : "Some work needs attention"} in ${receipt.durationMs}ms.`;
    return {
      summary,
      markdown: `## ${receipt.mutation}\n\n${summary}\n`,
      slack: summary
    };
  }

  notify(config: NotifyConfig): this {
    this.#notifyConfigs.push(config);
    return this;
  }

  runbooks(): Runbook[] {
    return [...this.#mutations.entries()].map(([mutation, definition]) => {
      const mirrors = [...this.#mirrors.values()].filter((mirror) => asArray(mirror.definition.when).includes(mutation)).map((mirror) => mirror.name);
      const owner = definition.owner;
      const markdown = [
        `# ${mutation}`,
        "",
        `Owner: ${owner ?? "unowned"}`,
        "",
        "## What it does",
        `Runs mutation consequences for ${mutation}.`,
        "",
        "## Targets",
        ...(mirrors.length ? mirrors.map((mirror) => `- ${mirror}`) : ["- no targets declared"]),
        "",
        "## Common commands",
        `- stalezero replay <receipt> --failed-only --safe-replay`,
        `- stalezero prove <receipt> --ci`,
        `- stalezero playbook <receipt>`
      ].join("\n");
      return { mutation, owner, markdown };
    });
  }

  autopilotRecipes(): ReturnType<StaleZero["autopilotRecipes"]> {
    const standard = (options: AutopilotRecipeOptions = {}): ResourceRecipe => ({
      name: "standard-resource",
      install: (resource) => {
        if (resource instanceof StaleZeroResourceBuilder) {
          resource.installStandard(options);
        }
      }
    });
    return {
      saasEntity: (options = {}) => standard({ redis: true, reactQuery: true, nextTag: true, socket: true, search: true, tenantGuard: true, ...options }),
      commerceProduct: (options = {}) => standard({ redis: true, reactQuery: true, nextTag: true, socket: true, search: true, ...options }),
      authSession: (options = {}) => standard({ redis: true, reactQuery: true, nextTag: false, socket: true, search: false, ...options }),
      webhook: (options = {}) => standard({ redis: false, reactQuery: false, nextTag: false, socket: false, search: false, ...options }),
      searchBackedEntity: (options = {}) => standard({ redis: true, reactQuery: true, nextTag: true, socket: false, search: true, ...options }),
      multiTenant: (options = {}) => standard({ redis: true, reactQuery: true, nextTag: true, socket: true, search: true, tenantGuard: true, ...options }),
      serverless: (options = {}) => standard({ redis: true, reactQuery: false, nextTag: true, socket: false, search: false, ...options })
    };
  }

  diagnostics(): Diagnostic[] {
    const manifest = this.generateManifest();
    const diagnostics: Diagnostic[] = [];
    for (const [name, mutation] of Object.entries(manifest.mutations)) {
      const definition = this.#mutations.get(name);
      if (!definition?.owner) {
        diagnostics.push({ code: "missing-owner", severity: "warning", message: `Mutation ${name} has no owner`, subject: name });
      }
      if (!definition?.schema) {
        diagnostics.push({ code: "missing-schema", severity: "warning", message: `Mutation ${name} has no schema`, subject: name });
      }
      if (mutation.mirrors.length === 0) {
        diagnostics.push({ code: "no-targets", severity: "info", message: `Mutation ${name} has no targets`, subject: name });
      }
    }
    for (const [name, mirror] of Object.entries(manifest.mirrors)) {
      if (mirror.when.length === 0) {
        diagnostics.push({ code: "orphan-target", severity: "error", message: `Target ${name} is not connected to a mutation`, subject: name });
      }
    }
    return diagnostics;
  }

  codeowners(): string {
    const owners = new Map<string, string[]>();
    for (const [name, definition] of this.#mutations) {
      if (!definition.owner) {
        continue;
      }
      owners.set(definition.owner, [...(owners.get(definition.owner) ?? []), name]);
    }
    const lines = ["# Generated from the StaleZero mutation owner map.", ""];
    for (const [owner, mutations] of owners) {
      for (const mutation of mutations) {
        lines.push(`docs/mutations/${mutation}.md @${owner}`);
      }
    }
    return `${lines.join("\n")}\n`;
  }

  async why(targetName: string, input: unknown = {}): Promise<WhyResult> {
    const mirror = this.#mirrors.get(targetName);
    if (!mirror) {
      const manifestMirror = this.#manifest?.mirrors[targetName];
      if (!manifestMirror) {
        throw new Error(`No target registered as ${targetName}`);
      }
      const manifestResult: WhyResult = {
        target: targetName,
        dependsOn: [],
        mutations: manifestMirror.when,
        toText: () =>
          [
            `${targetName} depends on:`,
            "- manifest only",
            "",
            "It becomes stale when:",
            ...manifestMirror.when.map((mutation) => `- ${mutation}`),
            "",
            "Last invalidated by:",
            "- not available from manifest"
          ].join("\n")
      };
      return manifestResult;
    }

    const mutations = [...asArray(mirror.definition.when)];
    const firstMutation = mutations[0];
    const definition = firstMutation ? this.#mutations.get(firstMutation) : undefined;
    const parsed = definition ? await this.#parseInput(definition.schema, input) : input;
    const context = await this.#context(firstMutation ?? "unknown", parsed, [], { dryRun: true });
    const dependsOn = mirror.definition.dependsOn
      ? await mirror.definition.dependsOn(parsed, context)
      : firstMutation
        ? (await this.#affected(firstMutation, parsed, []))
        : [];
    const receipts = await this.#receiptStore.list({ limit: 100 });
    const lastReceipt = receipts.find((receipt) =>
      receipt.targets.some((targetRef) => targetRef.label === targetName || targetRef.key === targetName)
    );

    return {
      target: targetName,
      dependsOn,
      mutations,
      lastReceipt,
      toText: () => {
        const lines = [
          `${targetName} depends on:`,
          ...(dependsOn.length ? dependsOn.map((ref) => `- ${ref.type}:${ref.id}`) : ["- none declared"]),
          "",
          "It becomes stale when:",
          ...(mutations.length ? mutations.map((mutation) => `- ${mutation}`) : ["- no mutations declared"]),
          "",
          "Last invalidated by:",
          lastReceipt ? `- ${lastReceipt.mutation} at ${new Date(lastReceipt.timestamp).toISOString()}` : "- never"
        ];
        return lines.join("\n");
      }
    };
  }

  receipt(id: string): Promise<Receipt | undefined> {
    return Promise.resolve(this.#receiptStore.get(id));
  }

  async exportReceipts(options?: { mutation?: string }): Promise<Receipt[]> {
    if (this.#receiptStore.export) {
      return this.#receiptStore.export(options);
    }
    return this.#receiptStore.list({ mutation: options?.mutation });
  }

  async useRecipe(recipe: RecipeInstaller<this>): Promise<this> {
    if (typeof recipe === "function") {
      await recipe(this);
      return this;
    }
    await recipe.install(this);
    return this;
  }

  useTemplate<Input = unknown>(name: string, definition: TemplateDefinition<Input>): this {
    const { mirrors, ...mutationDefinition } = definition;
    this.mutation(name, mutationDefinition as MutationDefinition<Input>);
    if (Array.isArray(mirrors)) {
      mirrors.forEach((mirror, index) => this.mirror(`${name}:target:${index + 1}`, mirror as MirrorDefinition));
    } else if (mirrors) {
      for (const [mirrorName, mirror] of Object.entries(mirrors)) {
        this.mirror(mirrorName, mirror as MirrorDefinition);
      }
    }
    return this;
  }

  resource(name: string, definition: ResourceDefinition): StaleZeroResourceBuilder {
    const idFromInput = (input: unknown): string => {
      const record = isRecord(input) ? input : {};
      const value = typeof definition.id === "function" ? definition.id(record) : record[definition.id];
      if (value === undefined || value === null || value === "") {
        throw new Error(`Resource ${name} could not derive an id`);
      }
      return String(value);
    };
    const mutationBase = `${name}Updated`;
    const entityType = name;
    this.mutation(mutationBase, {
      owner: definition.owner,
      affects: (input) => [entity(entityType, idFromInput(input))]
    });
    this.mutation(`${name}Deleted`, {
      owner: definition.owner,
      affects: (input) => [entity(entityType, idFromInput(input))]
    });

    const registerFor = (mutation: string): void => {
      if (definition.cache) {
        const prefix = typeof definition.cache === "object" ? definition.cache.prefix ?? `${name.toLowerCase()}:` : `${name.toLowerCase()}:`;
        this.mirror(`${mutation}:redis`, {
          when: mutation,
          owner: definition.owner,
          target: (input) => redisTarget(`${prefix}${idFromInput(input)}`, { owner: definition.owner })
        });
      }
      if (definition.query) {
        const key = typeof definition.query === "object" ? definition.query.key : undefined;
        this.mirror(`${mutation}:query`, {
          when: mutation,
          owner: definition.owner,
          target: (input) =>
            queryTarget(key ? key(idFromInput(input), input as Record<string, unknown>) : [name.toLowerCase(), idFromInput(input)], {
              owner: definition.owner
            })
        });
      }
      if (definition.next) {
        const tagFactory = typeof definition.next === "object" ? definition.next.tag : undefined;
        this.mirror(`${mutation}:next`, {
          when: mutation,
          owner: definition.owner,
          target: (input) =>
            nextTagTarget(tagFactory ? tagFactory(idFromInput(input), input as Record<string, unknown>) : `${name.toLowerCase()}:${idFromInput(input)}`, {
              owner: definition.owner
            })
        });
      }
      if (definition.socket) {
        const socketOptions = typeof definition.socket === "object" ? definition.socket : {};
        this.mirror(`${mutation}:socket`, {
          when: mutation,
          owner: definition.owner,
          target: (input) =>
            socketTarget(socketOptions.room ? socketOptions.room(idFromInput(input), input as Record<string, unknown>) : `${name.toLowerCase()}:${idFromInput(input)}`, {
              event: socketOptions.event,
              owner: definition.owner
            })
        });
      }
      if (definition.search) {
        const index = typeof definition.search === "object" ? definition.search.index ?? `${name.toLowerCase()}s` : `${name.toLowerCase()}s`;
        this.mirror(`${mutation}:search`, {
          when: mutation,
          owner: definition.owner,
          target: (input) => searchTarget(index, idFromInput(input), { owner: definition.owner })
        });
      }
    };

    registerFor(mutationBase);
    registerFor(`${name}Deleted`);
    return new StaleZeroResourceBuilder(this, name, definition);
  }

  compileManifest(): CompiledManifest {
    const manifest = this.generateManifest();
    const mutationToTargets: Record<string, string[]> = {};
    const targetToMutations: Record<string, string[]> = {};
    const adapterToTargets: Record<string, string[]> = {};

    for (const [mutation, item] of Object.entries(manifest.mutations)) {
      mutationToTargets[mutation] = [...item.mirrors].sort();
      for (const mirror of item.mirrors) {
        targetToMutations[mirror] = [...(targetToMutations[mirror] ?? []), mutation].sort();
      }
    }

    for (const [name, mirror] of this.#mirrors) {
      const adapterName = inferAdapterFromMirrorName(name);
      adapterToTargets[adapterName] = [...(adapterToTargets[adapterName] ?? []), name].sort();
      for (const mutation of asArray(mirror.definition.when)) {
        if (!mutationToTargets[mutation]?.includes(name)) {
          mutationToTargets[mutation] = [...(mutationToTargets[mutation] ?? []), name].sort();
        }
      }
    }

    return {
      ...manifest,
      indexes: {
        mutationToTargets,
        targetToMutations,
        adapterToTargets
      }
    };
  }

  coalesce(config: CoalesceConfig): this {
    this.#coalesceConfig = config;
    return this;
  }

  slo(name: string, config: SloConfig): this {
    this.#sloConfigs.set(name, config);
    return this;
  }

  devtools(options: StudioOptions = {}): StudioApi {
    this.#devtoolsOptions = { ...this.#devtoolsOptions, ...options };
    return {
      options: this.#devtoolsOptions,
      manifest: this.generateManifest(),
      handler: this.devtoolsHandler()
    };
  }

  security(config: SecurityConfig): this {
    this.#securityConfig = { ...this.#securityConfig, ...config };
    return this;
  }

  tenant(config: TenantConfig): this {
    this.#tenantConfig = config;
    return this;
  }

  sandbox(adapter: string, config: SandboxConfig): this {
    this.#sandboxConfigs.set(adapter, config);
    return this;
  }

  redact(options: RedactionOptions): this {
    if (options.keys) {
      this.#config.receipts.redact = options.keys;
    }
    if (options.redactWith) {
      this.#config.receipts.redactWith = options.redactWith;
    }
    if (options.receipts === false) {
      this.#config.receipts.redact = [];
      this.#config.receipts.redactWith = undefined;
    }
    return this;
  }

  approval(name: string, config: ApprovalConfig): this {
    this.#approvalGates.set(name, config);
    return this;
  }

  risk(config: RiskConfig): this {
    this.#riskConfig = { ...this.#riskConfig, ...config };
    return this;
  }

  rateLimit(name: string, config: RateLimitConfig): this {
    this.#rateLimitConfigs.set(name, config);
    return this;
  }

  inbox(config: InboxConfig = {}): InboxApi {
    const seen = new Set<string>();
    const eventKey = (event: StaleEvent): string =>
      typeof config.dedupeBy === "function" ? config.dedupeBy(event) : event.id;
    const processEvent = async (event: StaleEvent): Promise<Receipt | undefined> => {
      const key = eventKey(event);
      if (seen.has(key) || (await config.store?.has?.(key))) {
        return undefined;
      }
      if (config.verifySignature) {
        const valid = typeof config.verifySignature === "function" ? await config.verifySignature(event) : true;
        if (!valid) {
          throw new Error(`Inbox event ${key} failed signature verification`);
        }
      }
      seen.add(key);
      await config.store?.save(event);
      try {
        const receipt = await this.execute({
          mutation: event.mutation,
          input: event.input,
          explicitAffected: event.affected,
          options: { traceId: event.traceId, source: event.source, publish: false, idempotencyKey: event.id }
        });
        await config.store?.markProcessed?.(key, receipt);
        return receipt;
      } catch (error) {
        await config.store?.markFailed?.(key, error);
        throw error;
      }
    };

    return {
      process: processEvent,
      replay: (event) => processEvent({ ...event, id: createId("evt") }),
      deadLetter: async (event, error) => {
        await config.store?.deadLetter?.(eventKey(event), error);
      }
    };
  }

  async workflow<Input = unknown>(
    name: string,
    input: Input,
    run: (step: WorkflowStepRunner) => MaybePromise<void>,
    options: { idempotencyKey?: string } = {}
  ): Promise<WorkflowResult> {
    const steps: WorkflowStep[] = [];
    const completed = new Set<string>();
    const workflowId = options.idempotencyKey ?? createId("wf");
    const step: WorkflowStepRunner = async (stepName, task, stepOptions = {}) => {
      const stepId = stepOptions.idempotencyKey ?? `${workflowId}:${stepName}`;
      if (stepOptions.skip || completed.has(stepId)) {
        steps.push({ id: stepName, status: "skipped", durationMs: 0 });
        return undefined;
      }
      const started = now();
      try {
        const value = await task();
        completed.add(stepId);
        steps.push({ id: stepName, status: "success", durationMs: now() - started });
        return value;
      } catch (error) {
        await stepOptions.compensate?.();
        steps.push({ id: stepName, status: "failed", durationMs: now() - started, error: serializeError(error).message });
        throw error;
      }
    };

    try {
      await run(step);
      return { id: workflowId, name, steps, status: "success" };
    } catch {
      return { id: workflowId, name, steps, status: "failed" };
    }
  }

  blackbox(config: BlackboxConfig): this {
    this.#blackboxConfig = { ...this.#blackboxConfig, ...config };
    return this;
  }

  blackboxEntries(): BlackboxEntry[] {
    return this.#blackboxLog.map((entry) => ({ ...entry, preview: { ...entry.preview } }));
  }

  async status(): Promise<{ adapters: string[]; mutations: string[]; mirrors: string[]; receipts: number }> {
    return {
      adapters: [...this.#adapters.keys()].sort(),
      mutations: [...this.#mutations.keys()].sort(),
      mirrors: [...this.#mirrors.keys()].sort(),
      receipts: (await this.#receiptStore.list()).length
    };
  }

  async health(): Promise<{
    status: "ok" | "degraded";
    adapters: Array<{ name: string; status: string; details?: unknown; error?: string }>;
    receipts: number;
  }> {
    const adapters = await Promise.all(
      [...this.#adapters.values()].map(async (adapter) => {
        try {
          const health = adapter.health ? await adapter.health() : "ok";
          return typeof health === "string" ? { name: adapter.name, status: health } : { name: adapter.name, ...health };
        } catch (error) {
          return { name: adapter.name, status: "failed", error: serializeError(error).message };
        }
      })
    );
    return {
      status: adapters.every((adapter) => adapter.status === "ok") ? "ok" : "degraded",
      adapters,
      receipts: (await this.#receiptStore.list()).length
    };
  }

  async ready(): Promise<boolean> {
    return (await this.health()).status === "ok";
  }

  async shutdown(): Promise<void> {
    await Promise.all(this.#unsubscribeBuses.map((unsubscribe) => Promise.resolve(unsubscribe())));
    await Promise.all([...this.#adapters.values()].map((adapter) => adapter.shutdown?.()));
    this.#unsubscribeBuses.length = 0;
  }

  devtoolsHandler(): (request: unknown, response?: unknown) => Promise<unknown> {
    return async (_request, response) => {
      const payload = JSON.stringify(
        {
          status: await this.status(),
          manifest: this.generateManifest(),
          receipts: (await this.#receiptStore.list({ limit: 50 })).map((receipt) => receipt.toJSON())
        },
        null,
        2
      );

      if (response && typeof response === "object" && "setHeader" in response && "end" in response) {
        const nodeResponse = response as { setHeader: (name: string, value: string) => void; end: (body: string) => void };
        nodeResponse.setHeader("content-type", "application/json; charset=utf-8");
        nodeResponse.end(payload);
        return undefined;
      }

      return new Response(payload, { headers: { "content-type": "application/json; charset=utf-8" } });
    };
  }

  generateManifest(): Manifest {
    if (this.#manifest && this.#mutations.size === 0 && this.#mirrors.size === 0) {
      return {
        ...this.#manifest,
        adapters: uniqueStrings([...this.#manifest.adapters, ...this.#adapters.keys()]).sort()
      };
    }

    const mutations: Manifest["mutations"] = {};
    for (const [name, definition] of this.#mutations) {
      mutations[name] = {
        source: definition.source,
        owner: definition.owner,
        mirrors: [...this.#mirrors.values()]
          .filter((mirror) => asArray(mirror.definition.when).includes(name))
          .map((mirror) => mirror.name)
      };
    }

    const mirrors: Manifest["mirrors"] = {};
    for (const [name, mirror] of this.#mirrors) {
      mirrors[name] = {
        when: asArray(mirror.definition.when),
        description: mirror.definition.description,
        owner: mirror.definition.owner
      };
    }

    return {
      app: this.#config.app,
      environment: this.#config.environment,
      sources: [...this.#sources].sort(),
      mutations,
      mirrors,
      adapters: [...this.#adapters.keys()].sort(),
      generatedAt: new Date().toISOString()
    };
  }

  loadManifest(manifest: Manifest): this {
    this.#manifest = manifest;
    return this;
  }

  async previewRequest(request: Omit<ExecuteRequest, "options">): Promise<Preview> {
    const mutation = request.mutation;
    const definition = this.#mutations.get(mutation);
    const parsed = await this.#parseInput(definition?.schema, request.input);
    this.#assertPayloadSize(parsed);
    const affected = await this.#affected(mutation, parsed, request.explicitAffected ?? []);
    const context = await this.#context(mutation, parsed, affected, { dryRun: true });
    const changedFields = definition?.fields ? await definition.fields(parsed) : inferChangedFields(parsed);
    const targets = await this.#targets(mutation, parsed, context, request.explicitTargets ?? [], changedFields);
    const previewTargets =
      targets.length > 0 || !this.#manifest?.mutations[mutation]
        ? targets
        : this.#manifest.mutations[mutation].mirrors.map((mirror) => target("manifest", mirror, "invalidate", { label: mirror }));
    const risk = this.#assessRisk(mutation, parsed, previewTargets);
    const redactedInput = this.#redact(parsed);
    const targetConfidence = previewConfidenceForTargets(previewTargets);
    const confidence = summarizePreviewConfidence(targetConfidence);

    this.#recordBlackbox({
      id: createId("bbx"),
      mutation,
      input: this.#blackboxConfig.redact === false ? parsed : redactedInput,
      preview: { affected, targets: previewTargets, risk },
      timestamp: now()
    });

    return {
      mutation,
      input: redactedInput,
      affected,
      targets: previewTargets,
      risk,
      confidence,
      targetConfidence,
      toJSON: () => ({ mutation, input: redactedInput, affected, targets: previewTargets, risk, confidence, targetConfidence }),
      toText: () =>
        receiptToText({
          id: "preview",
          mutation,
          input: redactedInput,
          affected,
          targets: previewTargets,
          results: [],
          status: "dry-run",
          durationMs: 0,
          timestamp: now(),
          app: this.#config.app,
          risk
        })
    };
  }

  async execute(request: ExecuteRequest): Promise<Receipt> {
    const started = now();
    const mutation = request.mutation;
    const definition = this.#mutations.get(mutation);
    const options = this.#applyProfile(mutation, request.options);
    const consistency = this.#consistency(options);
    const dryRun = options?.dryRun === true || consistency === "dry-run";
    const proofOnly = options?.proofOnly === true;
    const parsed = await this.#parseInput(definition?.schema, request.input);
    this.#assertPayloadSize(parsed);
    const affected = await this.#affected(mutation, parsed, request.explicitAffected ?? []);
    const context = await this.#context(mutation, parsed, affected, {
      dryRun: dryRun || proofOnly,
      traceId: options?.traceId,
      source: options?.source,
      id: options?.idempotencyKey
    });
    const changedFields = definition?.fields ? await definition.fields(parsed) : inferChangedFields(parsed);
    const targets = await this.#targets(mutation, parsed, context, request.explicitTargets ?? [], changedFields);
    const orderedTargets = [...targets].sort((left, right) => (left.priority ?? 0) - (right.priority ?? 0));
    const risk = this.#assessRisk(mutation, parsed, orderedTargets);
    const previewForGuards = this.#previewFromParts(mutation, parsed, affected, orderedTargets, risk);
    const approval = await this.#guardMutation(mutation, parsed, affected, orderedTargets, options, previewForGuards, risk);

    let results: ExecutionResult[] = [];
    if (dryRun || proofOnly) {
      results = orderedTargets.map((targetRef) => this.#result(targetRef, "skipped", 0, 0, undefined, proofOnly ? "proof only" : "dry run"));
    } else {
      await this.#namedRateLimit(mutation, parsed, options?.actor);
      results = await this.#executeTargets(orderedTargets, context);
    }

    const publishResult = await this.#publishIfNeeded(context, options, dryRun || proofOnly);
    const receiptTargets = publishResult ? [...orderedTargets, publishResult.target] : orderedTargets;
    const receiptResults = publishResult ? [...results, publishResult.result] : results;
    const proofs =
      options?.prove === true || proofOnly
        ? await this.#proveTargets(receiptTargets, { ...context, dryRun: false }, options?.proofTimeoutMs, options?.proofRetries)
        : undefined;
    const proofStatus = proofStatusFrom(proofs);
    const resultStatus = dryRun ? "dry-run" : receiptStatus(receiptResults);
    const status = proofRequiredFailure(proofs)
      ? resultStatus === "success"
        ? "partial"
        : resultStatus
      : resultStatus;
    const durationMs = now() - started;
    const slo = this.#evaluateSlo(mutation, receiptResults, durationMs);
    const rollout = await this.#rolloutReceipt(mutation, parsed, affected, receiptTargets, risk);
    const shadow = await this.#shadowReceipts(mutation, parsed, receiptTargets);
    const receipt = createReceipt({
      id: context.id,
      mutation,
      payload: this.#redact(parsed),
      affected,
      targets: receiptTargets,
      results: receiptResults,
      status,
      durationMs,
      timestamp: context.timestamp,
      app: this.#config.app,
      traceId: context.traceId,
      owner: definition?.owner,
      risk,
      slo,
      proofs,
      proofStatus,
      cost: estimateCost(receiptTargets),
      freshness: this.#freshness(mutation, affected, receiptTargets, durationMs),
      changedFields,
      rollout,
      shadow,
      approval
    });

    this.#recordSloHistory(mutation, receipt);
    this.#recordBlackbox({
      id: createId("bbx"),
      mutation,
      input: this.#blackboxConfig.redact === false ? parsed : this.#redact(parsed),
      preview: { affected, targets: orderedTargets, risk },
      receipt: receipt.toJSON(),
      timestamp: context.timestamp,
      traceId: context.traceId
    });

    if (this.#shouldStoreReceipt()) {
      await this.#receiptStore.save(receipt);
      await this.#pruneReceipts();
    }

    await this.#audit({ type: "receipt", receipt });
    await this.#notify(receipt);

    if (consistency === "strict" && receipt.hasBlockingFailures()) {
      throw new StaleZeroExecutionError(receipt);
    }

    return receipt;
  }

  async #resolveReceipt(receiptOrId: string | Receipt): Promise<Receipt> {
    const receipt = typeof receiptOrId === "string" ? await this.receipt(receiptOrId) : receiptOrId;
    if (!receipt) {
      throw new Error("No receipt found");
    }
    return receipt;
  }

  async #scanDrift(type: string, id: string): Promise<DriftReport> {
    const entityRef = entity(type, id);
    const receipts = await this.#receiptStore.list({ limit: 1000 });
    const lastReceipt = receipts.find((receipt) => receipt.affected.some((ref) => ref.type === type && ref.id === id));
    const targets = lastReceipt?.targets ?? [];
    const findings: DriftFinding[] = [];

    for (const targetRef of targets) {
      const probe = this.#driftProbes.find((item) => item.adapter === targetRef.adapter);
      if (!probe) {
        findings.push({
          target: targetRef,
          status: "ok",
          message: "No probe registered; receipt history is the source of truth",
          lastReceiptId: lastReceipt?.id
        });
        continue;
      }
      try {
        const result = await probe.check({ target: targetRef, entity: entityRef, lastReceipt });
        const normalized =
          typeof result === "object" && result !== null
            ? result
            : { ok: result === true, message: typeof result === "string" ? result : undefined };
        findings.push({
          target: targetRef,
          status: normalized.ok ? "ok" : "drift",
          message: normalized.message ?? (normalized.ok ? "target matches graph expectation" : "target does not match graph expectation"),
          lastReceiptId: lastReceipt?.id
        });
      } catch (error) {
        findings.push({
          target: targetRef,
          status: "drift",
          message: serializeError(error).message,
          lastReceiptId: lastReceipt?.id
        });
      }
    }

    if (!lastReceipt) {
      findings.push({
        target: target("receipt", `${type}:${id}`, "custom"),
        status: "drift",
        message: "No receipt found for this entity"
      });
    }

    const status = findings.some((finding) => finding.status === "drift") ? "drift" : "ok";
    return {
      entity: entityRef,
      status,
      findings,
      lastReceipt,
      toText: () =>
        [
          status === "drift" ? "Drift detected." : "No drift detected.",
          "",
          `${type}:${id}`,
          "",
          ...findings.map((finding) => `- ${finding.status} ${finding.target.adapter}:${finding.target.key} ${finding.message}`)
        ].join("\n")
    };
  }

  #contractReport(): ServiceContractReport {
    const failures: string[] = [];
    for (const emitted of this.#emittedContracts) {
      for (const consumed of this.#consumedContracts.filter((item) => item.event === emitted.event)) {
        const diff = schemaDiff(emitted.event, emitted.schema, consumed.schema);
        if (diff.breaking) {
          failures.push(`${emitted.service} emits ${emitted.event}, but ${consumed.service} expects different fields: ${diff.changes.join(", ")}`);
        }
      }
    }
    return {
      passed: failures.length === 0,
      failures,
      emits: [...this.#emittedContracts],
      consumes: [...this.#consumedContracts],
      toText: () =>
        [
          "Service contract check",
          "",
          failures.length ? "Failures:" : "No mismatches found.",
          ...(failures.length ? failures.map((failure) => `- ${failure}`) : [])
        ].join("\n")
    };
  }

  #schemaDocs(): string {
    const lines = ["# Event schemas", ""];
    for (const [event, schema] of this.#schemaVersions) {
      lines.push(`## ${event}`, "", `Version: ${schema.version ?? "unversioned"}`, "");
      for (const [field, type] of Object.entries(schema.fields ?? {})) {
        const required = schema.required?.includes(field) ? "required" : "optional";
        lines.push(`- ${field}: ${type} (${required})`);
      }
      lines.push("");
    }
    return lines.join("\n");
  }

  #schemaMatrix(): Array<{ event: string; producers: string[]; consumers: string[]; status: "compatible" | "mismatch" }> {
    const events = uniqueStrings([...this.#emittedContracts, ...this.#consumedContracts].map((contract) => contract.event));
    return events.map((event) => {
      const producers = this.#emittedContracts.filter((contract) => contract.event === event);
      const consumers = this.#consumedContracts.filter((contract) => contract.event === event);
      const mismatch = producers.some((producer) =>
        consumers.some((consumer) => schemaDiff(event, producer.schema, consumer.schema).breaking)
      );
      return {
        event,
        producers: producers.map((contract) => contract.service),
        consumers: consumers.map((contract) => contract.service),
        status: mismatch ? "mismatch" : "compatible"
      };
    });
  }

  #applyProfile(mutation: string, options: ChangedOptions | undefined): ChangedOptions | undefined {
    const profileName = options?.profile ?? mutation;
    const profile = this.#profiles.get(profileName);
    if (!profile) {
      return options;
    }
    return {
      ...options,
      consistency: options?.consistency ?? profile.mode,
      prove: options?.prove ?? profile.prove,
      proofRetries: options?.proofRetries ?? profile.proofRetries,
      proofTimeoutMs: options?.proofTimeoutMs ?? profile.proofTimeoutMs,
      idempotencyKey:
        options?.idempotencyKey ??
        (profile.idempotency ? `${mutation}:${stableHash(options?.actor ?? "actor")}:${Date.now()}` : undefined)
    };
  }

  async #rolloutReceipt(
    mutation: string,
    input: unknown,
    affected: EntityRef[],
    targets: TargetRef[],
    risk: RiskResult
  ): Promise<Receipt["rollout"]> {
    const config = this.#rollouts.get(mutation);
    if (!config) {
      return undefined;
    }
    const percentage = config.percentage ?? 100;
    const tenant = isRecord(input) ? String(input.tenantId ?? "") : "";
    const environmentMatch = !config.environments?.length || Boolean(this.#config.environment && config.environments.includes(this.#config.environment));
    const tenantMatch = !config.tenants?.length || (tenant !== "" && config.tenants.includes(tenant));
    const active = environmentMatch && tenantMatch && rolloutBucket(`${mutation}:${stableHash(input)}`) < percentage;
    let difference: NonNullable<Receipt["rollout"]>["difference"] | undefined = undefined;
    if (active && config.compareWith && this.#mutations.has(config.compareWith)) {
      const current = {
        version: 1 as const,
        mutation,
        input,
        affected,
        targets,
        risk,
        createdAt: new Date().toISOString()
      };
      const previous = await this.snapshot(config.compareWith, input);
      difference = (await this.compareSnapshots(previous, current)).toJSON();
    }
    return {
      name: mutation,
      active,
      percentage,
      difference
    };
  }

  async #shadowReceipts(mutation: string, input: unknown, productionTargets: TargetRef[]): Promise<Receipt["shadow"]> {
    const shadows = [...this.#shadows.entries()].filter(([, config]) => config.from === mutation);
    if (shadows.length === 0) {
      return undefined;
    }
    const production = productionTargets.map(targetSignature).sort();
    const result: NonNullable<Receipt["shadow"]> = [];
    for (const [name, config] of shadows) {
      if (!this.#mutations.has(name) && !this.#manifest?.mutations[name]) {
        continue;
      }
      const preview = await this.preview(name, input);
      const shadowTargets = preview.targets.map(targetSignature).sort();
      result.push({
        name,
        from: config.from,
        productionTargets: production,
        shadowTargets,
        added: shadowTargets.filter((item) => !production.includes(item)),
        removed: production.filter((item) => !shadowTargets.includes(item))
      });
    }
    return result.length ? result : undefined;
  }

  #freshness(mutation: string, affected: EntityRef[], targets: TargetRef[], durationMs: number): FreshnessStatus | undefined {
    const checks: FreshnessStatus["checks"] = [];
    const names = uniqueStrings([
      mutation,
      ...affected.flatMap((ref) => [ref.type, `${ref.type}:${ref.id}`]),
      ...targets.flatMap((targetRef) => [targetRef.adapter, `${targetRef.adapter}:${targetRef.key}`, targetSignature(targetRef)])
    ]);
    for (const name of names) {
      const budget = this.#freshnessBudgets.get(name);
      if (!budget) {
        continue;
      }
      checks.push({
        name,
        status: durationMs <= budget.maxStaleMs ? "met" : "violated",
        actualMs: durationMs,
        maxStaleMs: budget.maxStaleMs
      });
    }
    if (checks.length === 0) {
      return undefined;
    }
    return {
      status: checks.every((check) => check.status === "met") ? "met" : "violated",
      checks
    };
  }

  async #notify(receipt: Receipt): Promise<void> {
    if (this.#notifyConfigs.length === 0) {
      return;
    }
    const severity = receipt.status === "failed" ? "failed" : receipt.status === "partial" ? "partial" : receipt.risk?.level;
    for (const config of this.#notifyConfigs) {
      const only = config.only ?? ["failed", "partial", "critical"];
      if (!only.includes("all") && (!severity || !only.includes(severity as "failed" | "partial" | "critical" | "high"))) {
        continue;
      }
      const message = {
        title: `StaleZero alert: ${receipt.mutation} ${receipt.status}`,
        body: receipt.toText(),
        receipt: receipt.toJSON()
      };
      try {
        await config.handler?.(message);
        const body = JSON.stringify({ text: `${message.title}\n${message.body}` });
        if (config.slack) {
          await fetch(config.slack, { method: "POST", headers: { "content-type": "application/json" }, body });
        }
        if (config.discord) {
          await fetch(config.discord, { method: "POST", headers: { "content-type": "application/json" }, body });
        }
      } catch {
        // Notification failures must not change mutation behavior.
      }
    }
  }

  async #chaosBeforeExecute(targetRef: TargetRef): Promise<void> {
    const config = this.#chaosConfig;
    if (!config || (config.adapter && config.adapter !== targetRef.adapter)) {
      return;
    }
    if ((config.slowRate ?? 0) > Math.random()) {
      await sleep(Math.floor(Math.random() * (config.maxDelayMs ?? 250)));
    }
    if ((config.failRate ?? 0) > Math.random()) {
      throw new Error(`Chaos mode failed ${targetRef.adapter}:${targetRef.key}`);
    }
  }

  async #executeTargets(targets: TargetRef[], context: MutationContext): Promise<ExecutionResult[]> {
    const batches = new Map<string, TargetRef[]>();
    const singles: Array<{ targetRef: TargetRef; index: number }> = [];

    targets.forEach((targetRef, index) => {
      const adapter = this.#adapters.get(targetRef.adapter);
      const batchKey = `${targetRef.adapter}:${targetRef.action}:${targetRef.priority ?? 0}:${targetRef.lane ?? "default"}`;
      if (adapter?.batchExecute) {
        batches.set(batchKey, [...(batches.get(batchKey) ?? []), targetRef]);
      } else {
        singles.push({ targetRef, index });
      }
    });

    const indexed: Array<{ index: number; result: ExecutionResult }> = [];
    await Promise.all(
      [...batches.entries()].map(async ([batchKey, batchTargets]) => {
        if (batchTargets.length <= 1) {
          const only = batchTargets[0];
          if (only) {
            indexed.push({ index: targets.indexOf(only), result: await this.#executeTarget(only, context) });
          }
          return;
        }
        const batchResults = await this.#executeBatch(batchKey, batchTargets, context);
        batchResults.forEach((result) => indexed.push({ index: targets.indexOf(result.target), result }));
      })
    );

    const singleResults = await mapLimit(singles, this.#config.execution.concurrency ?? 10, async ({ targetRef, index }) => ({
      index,
      result: await this.#executeTarget(targetRef, context)
    }));
    indexed.push(...singleResults);
    return indexed.sort((left, right) => left.index - right.index).map((entry) => entry.result);
  }

  async #proveTargets(targets: TargetRef[], context: MutationContext, timeoutMs?: number, retries = 0): Promise<StateProof[]> {
    return mapLimit(targets, this.#config.execution.concurrency ?? 10, async (targetRef) => {
      const started = now();
      const adapter = this.#adapters.get(targetRef.adapter);
      if (context.dryRun) {
        return {
          adapter: targetRef.adapter,
          key: targetRef.key,
          action: targetRef.action,
          status: "skipped",
          durationMs: 0,
          target: targetRef,
          required: targetRef.required !== false,
          attempts: 0,
          message: "dry run"
        };
      }
      if (!adapter?.verify) {
        return {
          adapter: targetRef.adapter,
          key: targetRef.key,
          action: targetRef.action,
          status: "skipped",
          durationMs: 0,
          target: targetRef,
          required: targetRef.required !== false,
          attempts: 0,
          message: "adapter has no verify method"
        };
      }
      let attempt = 0;
      let lastError: unknown;
      while (attempt < Math.max(1, retries + 1)) {
        attempt += 1;
        try {
          const result = await withTimeout(
            () => adapter.verify?.(targetRef, context),
            timeoutMs ?? targetRef.timeoutMs ?? this.#config.execution.timeoutMs ?? 3000,
            `${targetRef.adapter} proof ${targetRef.key}`
          );
          const normalized = normalizeProofResult(result);
          if (normalized.status === "confirmed" || attempt > retries) {
            return {
              adapter: targetRef.adapter,
              key: targetRef.key,
              action: targetRef.action,
              status: normalized.status,
              durationMs: now() - started,
              target: targetRef,
              required: targetRef.required !== false,
              attempts: attempt,
              evidence: normalized.evidence,
              message: normalized.message,
              error: normalized.error ? serializeError(normalized.error) : undefined
            };
          }
        } catch (error) {
          lastError = error;
          if (attempt <= retries) {
            await sleep(this.#retryDelay(attempt));
          }
        }
      }
      return {
        adapter: targetRef.adapter,
        key: targetRef.key,
        action: targetRef.action,
        status: "failed",
        durationMs: now() - started,
        target: targetRef,
        required: targetRef.required !== false,
        attempts: attempt,
        error: serializeError(lastError)
      };
    });
  }

  async #executeBatch(batchKey: string, batchTargets: TargetRef[], context: MutationContext): Promise<ExecutionResult[]> {
    const adapter = this.#adapters.get(batchTargets[0]?.adapter ?? "");
    const started = now();
    if (!adapter?.batchExecute) {
      return mapLimit(batchTargets, this.#config.execution.concurrency ?? 10, (targetRef) => this.#executeTarget(targetRef, context));
    }

    try {
      await withTimeout(
        () => adapter.batchExecute?.(batchTargets, context),
        Math.max(...batchTargets.map((targetRef) => targetRef.timeoutMs ?? this.#config.execution.timeoutMs ?? 3000)),
        `${adapter.name} batch`
      );
      return batchTargets.map((targetRef) =>
        this.#result(targetRef, "success", now() - started, 1, undefined, undefined, { key: batchKey, size: batchTargets.length })
      );
    } catch (error) {
      return batchTargets.map((targetRef) =>
        this.#result(targetRef, "failed", now() - started, 1, error, undefined, { key: batchKey, size: batchTargets.length })
      );
    }
  }

  async #executeTarget(targetRef: TargetRef, context: MutationContext): Promise<ExecutionResult> {
    const circuit = this.#circuit(targetRef.adapter);
    if (circuit.openUntil > now()) {
      const result = this.#result(targetRef, "failed", 0, 0, new Error(`Circuit breaker is open for adapter ${targetRef.adapter}`));
      await this.#audit({ type: "adapter-result", result, context });
      return result;
    }

    await this.#rateLimit(targetRef.adapter);

    const coalesced = this.#coalesce(targetRef, context);
    if (coalesced > 0) {
      const result = this.#result(targetRef, "skipped", 0, 0, undefined, "coalesced", undefined, { count: coalesced });
      await this.#audit({ type: "adapter-result", result, context });
      return result;
    }

    const dedupeKey = `${targetRef.adapter}:${targetRef.action}:${targetRef.key}`;
    const dedupeWindowMs = this.#config.execution.dedupeWindowMs ?? 0;
    const lastRun = this.#recentTargets.get(dedupeKey);
    if (dedupeWindowMs > 0 && lastRun && now() - lastRun < dedupeWindowMs) {
      const result = this.#result(targetRef, "skipped", 0, 0, undefined, "deduped");
      await this.#audit({ type: "adapter-result", result, context });
      return result;
    }
    this.#recentTargets.set(dedupeKey, now());

    const adapter = this.#adapters.get(targetRef.adapter);
    if (!adapter) {
      const result = this.#result(targetRef, "failed", 0, 0, new Error(`No adapter registered for ${targetRef.adapter}`));
      await this.#audit({ type: "adapter-result", result, context });
      return result;
    }

    const maxAttempts = Math.max(1, (targetRef.retries ?? this.#config.execution.retries ?? 0) + 1);
    let attempt = 0;
    let lastError: unknown;
    const started = now();

    while (attempt < maxAttempts) {
      attempt += 1;
      try {
        await this.#chaosBeforeExecute(targetRef);
        await withTimeout(
          () => adapter.execute(targetRef, context),
          targetRef.timeoutMs ?? this.#config.execution.timeoutMs ?? 3000,
          `${targetRef.adapter} ${targetRef.key}`
        );
        const result = this.#result(targetRef, "success", now() - started, attempt);
        this.#recordCircuitSuccess(targetRef.adapter);
        await this.#audit({ type: "adapter-result", result, context });
        return result;
      } catch (error) {
        lastError = error;
        if (attempt < maxAttempts) {
          await sleep(this.#retryDelay(attempt));
        }
      }
    }

    const result = this.#result(targetRef, "failed", now() - started, attempt, lastError);
    this.#recordCircuitFailure(targetRef.adapter);
    await this.#audit({ type: "adapter-result", result, context });
    return result;
  }

  async #publishIfNeeded(
    context: MutationContext,
    options: ChangedOptions | undefined,
    dryRun: boolean
  ): Promise<{ target: TargetRef; result: ExecutionResult } | undefined> {
    if (dryRun || options?.publish === false || this.#buses.length === 0) {
      return undefined;
    }
    if (!this.#config.distributed.enabled && options?.publish !== true) {
      return undefined;
    }

    const targetRef = target("bus", this.#buses.map((bus) => bus.name).join(","), "publish");
    const started = now();
    const event: StaleEvent = {
      id: context.id,
      app: this.#config.app,
      environment: this.#config.environment,
      mutation: context.mutation,
      input: context.input,
      affected: context.affected,
      timestamp: context.timestamp,
      traceId: context.traceId,
      source: context.source,
      hops: 0
    };

    try {
      await Promise.all(
        this.#buses.map(async (bus) => {
          await bus.publish(event);
          await this.#audit({ type: "event-published", event, bus: bus.name });
        })
      );
      return { target: targetRef, result: this.#result(targetRef, "success", now() - started, 1) };
    } catch (error) {
      return { target: targetRef, result: this.#result(targetRef, "failed", now() - started, 1, error) };
    }
  }

  async #handleEvent(event: StaleEvent): Promise<void> {
    this.#pruneEvents();
    if (this.#seenEvents.has(event.id)) {
      return;
    }
    this.#seenEvents.set(event.id, now());

    if (this.#config.distributed.ignoreSelf && event.app && event.app === this.#config.app) {
      return;
    }
    if (event.hops >= (this.#config.distributed.maxHops ?? 3)) {
      return;
    }

    await this.execute({
      mutation: event.mutation,
      input: event.input,
      explicitAffected: event.affected,
      options: { traceId: event.traceId, source: event.source, publish: false, idempotencyKey: event.id }
    });
  }

  #pruneEvents(): void {
    const ttl = this.#config.distributed.dedupeTtlMs ?? 60_000;
    const cutoff = now() - ttl;
    for (const [id, timestamp] of this.#seenEvents) {
      if (timestamp < cutoff) {
        this.#seenEvents.delete(id);
      }
    }
  }

  #consistency(options?: ChangedOptions): ConsistencyMode {
    if (options?.dryRun) {
      return "dry-run";
    }
    return options?.consistency ?? this.#config.execution.defaultConsistency ?? "best-effort";
  }

  async #parseInput(schema: SchemaLike<unknown> | undefined, input: unknown): Promise<unknown> {
    if (!schema) {
      return input;
    }
    if ("parse" in schema) {
      return schema.parse(input);
    }
    if ("safeParse" in schema) {
      const result = schema.safeParse(input);
      if (result.success) {
        return result.data;
      }
      throw new Error(`Invalid mutation input: ${formatError(result.error)}`);
    }
    if ("~standard" in schema) {
      const result = await schema["~standard"].validate(input);
      if ("value" in result) {
        return result.value;
      }
      throw new Error(`Invalid mutation input: ${formatError(result.issues)}`);
    }
    return schema.validate(input);
  }

  async #affected(mutation: string, input: unknown, explicit: EntityRef[]): Promise<EntityRef[]> {
    const definition = this.#mutations.get(mutation);
    const affected = definition?.affects ? await definition.affects(input) : [];
    return uniqueEntities([...explicit, ...affected]);
  }

  async #targets(mutation: string, input: unknown, context: MutationContext, explicit: TargetRef[], changedFields: string[] = []): Promise<TargetRef[]> {
    const definition = this.#mutations.get(mutation);
    const inlineTargets = definition?.targets ? await definition.targets(input, context) : [];
    const routeTargets = await this.#routeTargets(definition, input, context, changedFields);
    const mirrorTargets: TargetRef[] = [];

    for (const mirror of this.#mirrors.values()) {
      if (!asArray(mirror.definition.when).includes(mutation)) {
        continue;
      }
      const generated = await mirror.definition.target(input, context);
      for (const targetRef of asArray(generated).filter(isTargetRef)) {
        mirrorTargets.push({ ...targetRef, label: targetRef.label ?? mirror.name, owner: targetRef.owner ?? mirror.definition.owner });
      }
    }

    const targets = uniqueTargets([...explicit, ...inlineTargets, ...routeTargets, ...mirrorTargets]);
    return filterTargetsByRoutes(targets, definition, changedFields);
  }

  async #routeTargets(
    definition: MutationDefinition | undefined,
    input: unknown,
    context: MutationContext,
    changedFields: string[]
  ): Promise<TargetRef[]> {
    if (!definition?.routes || changedFields.length === 0) {
      return [];
    }
    const routed: TargetRef[] = [];
    for (const field of changedFields) {
      const route = definition.routes[field];
      if (!route) {
        continue;
      }
      if (typeof route === "function") {
        routed.push(...(await route(input, context)));
      } else {
        for (const item of route) {
          if (isTargetRef(item)) {
            routed.push(item);
          }
        }
      }
    }
    return routed;
  }

  async #context(
    mutation: string,
    input: unknown,
    affected: EntityRef[],
    options: { dryRun: boolean; traceId?: string; source?: string; id?: string }
  ): Promise<MutationContext> {
    return {
      id: options.id ?? createId("rcp"),
      mutation,
      input,
      affected,
      timestamp: now(),
      app: this.#config.app,
      environment: this.#config.environment,
      traceId: options.traceId ?? createId("trace"),
      source: options.source ?? this.#config.source,
      dryRun: options.dryRun
    };
  }

  #result(
    targetRef: TargetRef,
    status: ExecutionStatus,
    durationMs: number,
    attempts: number,
    error?: unknown,
    skippedReason?: string,
    batch?: ExecutionResult["batch"],
    coalesced?: ExecutionResult["coalesced"]
  ): ExecutionResult {
    return {
      adapter: targetRef.adapter,
      key: targetRef.key,
      action: targetRef.action,
      status,
      durationMs,
      attempts,
      target: targetRef,
      skippedReason,
      batch,
      coalesced,
      error: error ? serializeError(error) : undefined
    };
  }

  #shouldStoreReceipt(): boolean {
    const config = this.#config.receipts;
    if (!config.enabled) {
      return false;
    }
    return Math.random() <= (config.sampleRate ?? 1);
  }

  async #pruneReceipts(): Promise<void> {
    if (!this.#receiptStore.prune) {
      return;
    }
    const { retentionMs, maxEntries } = this.#config.receipts;
    if (retentionMs === undefined && maxEntries === undefined) {
      return;
    }
    await this.#receiptStore.prune({ maxAgeMs: retentionMs, maxEntries });
  }

  #redact(value: unknown): unknown {
    const keys = new Set(this.#config.receipts.redact ?? []);
    if (keys.size === 0 && !this.#config.receipts.redactWith) {
      return value;
    }
    return redactValue(value, keys, this.#config.receipts.redactWith);
  }

  #assertPayloadSize(value: unknown): void {
    const limit = this.#config.execution.payloadLimitBytes;
    if (!Number.isFinite(limit)) {
      return;
    }
    const size = new TextEncoder().encode(JSON.stringify(value)).length;
    if (size > limit) {
      throw new Error(`Mutation payload is ${size} bytes, above the configured limit of ${limit} bytes`);
    }
  }

  #previewFromParts(mutation: string, input: unknown, affected: EntityRef[], targets: TargetRef[], risk: RiskResult): Preview {
    const redactedInput = this.#redact(input);
    const targetConfidence = previewConfidenceForTargets(targets);
    const confidence = summarizePreviewConfidence(targetConfidence);
    return {
      mutation,
      input: redactedInput,
      affected,
      targets,
      risk,
      confidence,
      targetConfidence,
      toJSON: () => ({ mutation, input: redactedInput, affected, targets, risk, confidence, targetConfidence }),
      toText: () =>
        receiptToText({
          id: "preview",
          mutation,
          input: redactedInput,
          affected,
          targets,
          results: [],
          status: "dry-run",
          durationMs: 0,
          timestamp: now(),
          app: this.#config.app,
          risk
        })
    };
  }

  async #guardMutation(
    mutation: string,
    input: unknown,
    _affected: EntityRef[],
    targets: TargetRef[],
    options: ChangedOptions | undefined,
    preview: Preview,
    risk: RiskResult
  ): Promise<Receipt["approval"]> {
    const security = this.#securityConfig;
    const definition = this.#mutations.get(mutation);
    if (security?.requireActor && !options?.actor) {
      throw new Error(`Blocked ${mutation}: actor is required`);
    }
    if (security?.requireSchema && !definition?.schema) {
      throw new Error(`Blocked ${mutation}: schema is required`);
    }
    if (security?.requireTenantBoundary && !this.#tenantConfig) {
      throw new Error(`Blocked ${mutation}: tenant boundary is required`);
    }
    if (this.#tenantConfig) {
      const actorTenant = this.#tenantConfig.actorTenant({ actor: options?.actor, input });
      const inputTenant = this.#tenantConfig.inputTenant({ actor: options?.actor, input });
      if (this.#tenantConfig.blockCrossTenant !== false && actorTenant && inputTenant && actorTenant !== inputTenant) {
        throw new Error(`Blocked ${mutation}: cross-tenant mutation from ${actorTenant} to ${inputTenant}`);
      }
    }
    if (security?.blockUnsafeTargets) {
      this.#assertSafeTargets(targets);
    }
    this.#assertSandboxTargets(targets);

    if (this.#riskConfig?.block && compareRisk(risk.level, this.#riskConfig.block) >= 0) {
      throw new Error(`Blocked ${mutation}: risk ${risk.level} reached configured block level`);
    }

    const approvalGate = this.#approvalGates.get(mutation);
    const riskNeedsApproval = this.#riskConfig?.requireApproval
      ? compareRisk(risk.level, this.#riskConfig.requireApproval) >= 0
      : false;
    const gateNeedsApproval = approvalGate?.requiredWhen({ preview, risk }) ?? false;
    if (riskNeedsApproval || gateNeedsApproval) {
      if (!options?.approvalToken) {
        throw new Error(`Approval required for ${mutation}`);
      }
      return { required: true, granted: true, approver: options.approvalToken };
    }

    return { required: false, granted: true };
  }

  #assertSafeTargets(targets: TargetRef[]): void {
    for (const targetRef of targets) {
      if (targetRef.adapter === "http") {
        assertSafeHttpTarget(targetRef);
      }
      if (targetRef.adapter === "redis" && (targetRef.key === "*" || Boolean(targetRef.meta?.pattern))) {
        throw new Error(`Blocked Redis target ${targetRef.key}: wildcard deletes require an explicit sandbox allowlist`);
      }
    }
  }

  #assertSandboxTargets(targets: TargetRef[]): void {
    const grouped = new Map<string, TargetRef[]>();
    for (const targetRef of targets) {
      grouped.set(targetRef.adapter, [...(grouped.get(targetRef.adapter) ?? []), targetRef]);
    }
    for (const [adapter, adapterTargets] of grouped) {
      const config = this.#sandboxConfigs.get(adapter);
      if (!config) {
        continue;
      }
      if (config.maxKeysPerMutation !== undefined && adapterTargets.length > config.maxKeysPerMutation) {
        throw new Error(`Blocked ${adapter}: ${adapterTargets.length} targets exceeds ${config.maxKeysPerMutation}`);
      }
      for (const targetRef of adapterTargets) {
        if (config.denyPatterns?.some((pattern) => patternMatches(pattern, targetRef.key))) {
          throw new Error(`Blocked ${adapter} target ${targetRef.key}: denied by sandbox`);
        }
        if (config.allowedPrefixes?.length && !config.allowedPrefixes.some((prefix) => targetRef.key.startsWith(prefix))) {
          throw new Error(`Blocked ${adapter} target ${targetRef.key}: prefix is not allowed`);
        }
      }
    }
  }

  #assessRisk(mutation: string, input: unknown, targets: TargetRef[]): RiskResult {
    const reasons: string[] = [];
    let score = 0;
    if (targets.length > 100) {
      score += 80;
      reasons.push(`${targets.length} targets`);
    } else if (targets.length > 25) {
      score += 35;
      reasons.push(`${targets.length} targets`);
    } else if (targets.length > 10) {
      score += 15;
      reasons.push(`${targets.length} targets`);
    }
    if (targets.some((targetRef) => targetRef.adapter === "http")) {
      score += 25;
      reasons.push("includes HTTP target");
    }
    if (targets.some((targetRef) => targetRef.adapter === "redis" && (targetRef.key.includes("*") || Boolean(targetRef.meta?.pattern)))) {
      score += 35;
      reasons.push("includes Redis pattern delete");
    }
    if (/tenant|delete|purge|reset/i.test(mutation)) {
      score += 20;
      reasons.push("mutation name implies broad or destructive scope");
    }
    const payloadSize = new TextEncoder().encode(JSON.stringify(input)).length;
    if (payloadSize > 16_384) {
      score += 10;
      reasons.push("large payload");
    }

    return {
      level: score >= 90 ? "critical" : score >= 60 ? "high" : score >= 25 ? "medium" : "low",
      score,
      reasons: reasons.length ? reasons : ["normal target count"],
      targetCount: targets.length
    };
  }

  #evaluateSlo(mutation: string, results: ExecutionResult[], durationMs: number): SloEvaluation | undefined {
    const config = this.#sloConfigs.get(mutation);
    if (!config) {
      return undefined;
    }
    const checks: SloEvaluation["checks"] = [];
    if (config.maxDurationMs !== undefined) {
      checks.push({
        name: "duration",
        status: durationMs <= config.maxDurationMs ? "passed" : "failed",
        actual: durationMs,
        limit: config.maxDurationMs,
        message: `${durationMs}ms / ${config.maxDurationMs}ms`
      });
    }
    for (const adapter of config.requiredTargets ?? []) {
      const adapterResults = results.filter((result) => result.adapter === adapter || result.target.label === adapter || result.key === adapter);
      checks.push({
        name: `required target ${adapter}`,
        status: adapterResults.length > 0 && adapterResults.every((result) => result.status !== "failed") ? "passed" : "failed"
      });
    }
    if (config.maxFailureRate !== undefined) {
      const history = this.#sloHistory.get(mutation) ?? [];
      const failures = history.filter((entry) => entry.failed).length + (results.some((result) => result.status === "failed") ? 1 : 0);
      const total = history.length + 1;
      const rate = failures / total;
      checks.push({
        name: "failure rate",
        status: rate <= config.maxFailureRate ? "passed" : "failed",
        actual: Number(rate.toFixed(4)),
        limit: config.maxFailureRate,
        message: `${Number(rate.toFixed(4))} / ${config.maxFailureRate}`
      });
    }
    return {
      status: checks.every((check) => check.status === "passed") ? "passed" : "failed",
      checks
    };
  }

  #recordSloHistory(mutation: string, receipt: Receipt): void {
    if (!this.#sloConfigs.has(mutation)) {
      return;
    }
    const history = (this.#sloHistory.get(mutation) ?? []).filter((entry) => now() - entry.timestamp < 60_000);
    history.push({ timestamp: now(), failed: receipt.hasFailures() });
    this.#sloHistory.set(mutation, history);
  }

  async #namedRateLimit(mutation: string, input: unknown, actor: unknown): Promise<void> {
    const config = this.#rateLimitConfigs.get(mutation);
    if (!config) {
      return;
    }
    const bucketKey = `${mutation}:${config.key ? config.key({ input, actor }) : "global"}`;
    const current = now();
    const bucket = (this.#namedRateBuckets.get(bucketKey) ?? []).filter((timestamp) => current - timestamp < config.windowMs);
    if (bucket.length >= config.max) {
      throw new Error(`Rate limit exceeded for ${mutation}`);
    }
    bucket.push(current);
    this.#namedRateBuckets.set(bucketKey, bucket);
  }

  #coalesce(targetRef: TargetRef, context: MutationContext): number {
    const config = this.#coalesceConfig;
    if (!config || config.windowMs <= 0) {
      return 0;
    }
    const key =
      config.by === "mutation"
        ? context.mutation
        : config.by === "entity"
          ? context.affected.map((ref) => `${ref.type}:${ref.id}`).join(",")
          : targetSignature(targetRef);
    const lastRun = this.#recentTargets.get(`coalesce:${key}`);
    if (lastRun && now() - lastRun < config.windowMs) {
      const countKey = `coalesce-count:${key}`;
      const current = this.#recentTargets.get(countKey) ?? 0;
      this.#recentTargets.set(countKey, current + 1);
      return current + 1;
    }
    this.#recentTargets.set(`coalesce:${key}`, now());
    this.#recentTargets.set(`coalesce-count:${key}`, 0);
    return 0;
  }

  #recordBlackbox(entry: BlackboxEntry): void {
    if (!this.#blackboxConfig.enabled) {
      return;
    }
    this.#blackboxLog.push(entry);
    const retainLast = this.#blackboxConfig.retainLast ?? 1000;
    while (this.#blackboxLog.length > retainLast) {
      this.#blackboxLog.shift();
    }
  }

  async #audit(event: AuditEvent): Promise<void> {
    const hooks = this.#config.hooks;
    if (!hooks) {
      return;
    }

    try {
      await hooks.onAudit?.(event);
      if (event.type === "adapter-result") {
        await hooks.onAdapterResult?.(event);
      } else if (event.type === "receipt") {
        await hooks.onReceipt?.(event);
      } else {
        await hooks.onEventPublished?.(event);
      }
    } catch {
      // Audit hooks should never change mutation behavior.
    }
  }

  #circuit(adapter: string): CircuitState {
    let state = this.#circuits.get(adapter);
    if (!state) {
      state = { failures: 0, openUntil: 0 };
      this.#circuits.set(adapter, state);
    }
    return state;
  }

  #recordCircuitSuccess(adapter: string): void {
    if (!this.#config.execution.circuitBreaker.enabled) {
      return;
    }
    this.#circuits.set(adapter, { failures: 0, openUntil: 0 });
  }

  #recordCircuitFailure(adapter: string): void {
    const config = this.#config.execution.circuitBreaker;
    if (!config.enabled) {
      return;
    }
    const state = this.#circuit(adapter);
    state.failures += 1;
    if (state.failures >= (config.failureThreshold ?? 5)) {
      state.openUntil = now() + (config.cooldownMs ?? 30_000);
    }
  }

  #retryDelay(attempt: number): number {
    const retry = this.#config.execution.retry;
    const base = retry.backoffMs ?? 0;
    if (base <= 0) {
      return 0;
    }
    const capped = Math.min(base * 2 ** Math.max(0, attempt - 1), retry.maxBackoffMs ?? 1000);
    if (!retry.jitter) {
      return capped;
    }
    return Math.floor(capped / 2 + Math.random() * (capped / 2));
  }

  async #rateLimit(adapter: string): Promise<void> {
    const limit = this.#config.execution.rateLimitPerSecond;
    if (!Number.isFinite(limit) || limit <= 0) {
      return;
    }
    const current = now();
    const bucket = (this.#rateBuckets.get(adapter) ?? []).filter((timestamp) => current - timestamp < 1000);
    if (bucket.length >= limit) {
      const oldest = bucket[0] ?? current;
      const waitMs = Math.max(0, 1000 - (current - oldest));
      await sleep(waitMs);
    }
    bucket.push(now());
    this.#rateBuckets.set(adapter, bucket);
  }
}

export class StaleZeroExecutionError extends Error {
  readonly receipt: Receipt;

  constructor(receipt: Receipt) {
    super(`Mutation ${receipt.mutation} finished with status ${receipt.status}`);
    this.name = "StaleZeroExecutionError";
    this.receipt = receipt;
  }
}

export function createStaleZero(config?: StaleZeroConfig): StaleZero<{}> {
  return new StaleZeroEngine(config) as unknown as StaleZero<{}>;
}

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function isTargetRef(value: unknown): value is TargetRef {
  return Boolean(value && typeof value === "object" && "adapter" in value && "key" in value && "action" in value);
}

function uniqueEntities(entities: EntityRef[]): EntityRef[] {
  const seen = new Set<string>();
  const result: EntityRef[] = [];
  for (const entityRef of entities) {
    const key = `${entityRef.type}:${entityRef.id}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(entityRef);
    }
  }
  return result;
}

function uniqueTargets(targets: TargetRef[]): TargetRef[] {
  const seen = new Set<string>();
  const result: TargetRef[] = [];
  for (const targetRef of targets) {
    const key = `${targetRef.adapter}:${targetRef.action}:${targetRef.key}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(targetRef);
    }
  }
  return result;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function targetSignature(targetRef: TargetRef): string {
  return `${targetRef.adapter}:${targetRef.action}:${targetRef.key}`;
}

function snapshotToText(snapshot: MutationSnapshotData): string {
  return [
    `Snapshot: ${snapshot.mutation}`,
    "",
    "Affected:",
    ...(snapshot.affected.length ? snapshot.affected.map((ref) => `- ${ref.type}:${ref.id}`) : ["- none declared"]),
    "",
    "Targets:",
    ...(snapshot.targets.length ? snapshot.targets.map((targetRef) => `- ${targetSignature(targetRef)}`) : ["- no targets"]),
    "",
    `Risk: ${snapshot.risk.level}`
  ].join("\n");
}

function snapshotDiffToText(diff: { mutation: string; added: string[]; removed: string[]; unchanged: string[]; risk: RiskLevel }): string {
  return [
    `Mutation blast radius changed: ${diff.mutation}`,
    "",
    "Removed:",
    ...(diff.removed.length ? diff.removed.map((item) => `- ${item}`) : ["- none"]),
    "",
    "Added:",
    ...(diff.added.length ? diff.added.map((item) => `- ${item}`) : ["- none"]),
    "",
    `Risk: ${diff.risk}`
  ].join("\n");
}

function diffRisk(added: number, removed: number, rightRisk: RiskResult): RiskLevel {
  if (rightRisk.level === "critical" || removed > 10) {
    return "critical";
  }
  if (rightRisk.level === "high" || added + removed > 5) {
    return "high";
  }
  if (rightRisk.level === "medium" || added + removed > 0) {
    return "medium";
  }
  return "low";
}

const riskOrder: RiskLevel[] = ["low", "medium", "high", "critical"];

function compareRisk(left: RiskLevel, right: RiskLevel): number {
  return riskOrder.indexOf(left) - riskOrder.indexOf(right);
}

function schemaDiff(event: string, from: ServiceContract["schema"] | undefined, to: ServiceContract["schema"] | undefined): {
  event: string;
  from?: ServiceContract["schema"];
  to?: ServiceContract["schema"];
  breaking: boolean;
  changes: string[];
  toText: () => string;
} {
  if (to === undefined) {
    to = from;
  }
  const changes: string[] = [];
  const fromFields = from?.fields ?? {};
  const toFields = to?.fields ?? {};
  for (const field of Object.keys(fromFields)) {
    if (!(field in toFields)) {
      changes.push(`removed field ${field}`);
    } else if (fromFields[field] !== toFields[field]) {
      changes.push(`changed ${field} from ${fromFields[field]} to ${toFields[field]}`);
    }
  }
  for (const field of Object.keys(toFields)) {
    if (!(field in fromFields)) {
      changes.push(`added field ${field}`);
    }
  }
  for (const field of to?.required ?? []) {
    if (!from?.required?.includes(field) && !(field in fromFields)) {
      changes.push(`new required field ${field}`);
    }
  }
  const breaking = changes.some((change) => change.startsWith("removed") || change.startsWith("changed") || change.startsWith("new required"));
  return {
    event,
    from,
    to,
    breaking,
    changes,
    toText: () => [`Schema diff: ${event}`, "", ...(changes.length ? changes.map((change) => `- ${change}`) : ["- no changes"])].join("\n")
  };
}

function estimateCost(targets: TargetRef[]): CostReport {
  const adapterCalls: Record<string, number> = {};
  let score = 0;
  let estimatedExternalCalls = 0;
  const reasons: string[] = [];
  for (const targetRef of targets) {
    adapterCalls[targetRef.adapter] = (adapterCalls[targetRef.adapter] ?? 0) + 1;
    score += targetRef.cost ?? 1;
    if (["http", "webhook", "search", "socket", "queue", "job"].includes(targetRef.adapter)) {
      estimatedExternalCalls += 1;
      score += 3;
    }
    if (targetRef.key.includes("*")) {
      score += 10;
    }
  }
  if (targets.length > 25) {
    reasons.push(`${targets.length} targets`);
  }
  if (estimatedExternalCalls > 0) {
    reasons.push(`${estimatedExternalCalls} external calls`);
  }
  if (targets.some((targetRef) => targetRef.key.includes("*"))) {
    reasons.push("wildcard target");
  }
  if (reasons.length === 0) {
    reasons.push("small local blast radius");
  }
  return {
    level: score >= 75 ? "high" : score >= 25 ? "medium" : "low",
    score,
    targets: targets.length,
    adapterCalls,
    estimatedExternalCalls,
    reasons
  };
}

function normalizeProofResult(
  result: boolean | string | ProofResult | { ok: boolean; message?: string; evidence?: unknown } | void
): ProofResult {
  if (result === true) {
    return { status: "confirmed" };
  }
  if (result === false || result === undefined) {
    return { status: "failed", message: result === undefined ? "verify returned no result" : undefined };
  }
  if (typeof result === "string") {
    return { status: "confirmed", message: result };
  }
  if ("status" in result) {
    return result;
  }
  return {
    status: result.ok ? "confirmed" : "failed",
    message: result.message,
    evidence: result.evidence
  };
}

function proofRequiredFailure(proofs: StateProof[] | undefined): boolean {
  return Boolean(proofs?.some((proof) => proof.required && proof.status === "failed"));
}

function proofStatusFrom(proofs: StateProof[] | undefined): ProofResult["status"] | undefined {
  if (!proofs) {
    return undefined;
  }
  if (proofs.some((proof) => proof.required && proof.status === "failed")) {
    return "failed";
  }
  if (proofs.some((proof) => proof.status === "confirmed")) {
    return "confirmed";
  }
  return "skipped";
}

function inferChangedFields(input: unknown): string[] {
  if (!isRecord(input)) {
    return [];
  }
  if (Array.isArray(input.fields)) {
    return input.fields.map(String);
  }
  if (isRecord(input.before) && isRecord(input.after)) {
    const before = input.before;
    const after = input.after;
    const keys = uniqueStrings([...Object.keys(before), ...Object.keys(after)]);
    return keys.filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
  }
  if (isRecord(input.after)) {
    return Object.keys(input.after);
  }
  return Object.keys(input).filter((key) => !["actor", "tenantId", "requestId"].includes(key));
}

function filterTargetsByRoutes(targets: TargetRef[], definition: MutationDefinition | undefined, changedFields: string[]): TargetRef[] {
  if (!definition?.routes || changedFields.length === 0) {
    return targets;
  }
  const routeValues: Array<string | TargetRef> = [];
  for (const field of changedFields) {
    const route = definition.routes[field];
    if (Array.isArray(route)) {
      routeValues.push(...(route as Array<string | TargetRef>));
    }
  }
  const namedRoutes = routeValues.filter((item): item is string => typeof item === "string");
  const routeTargets = routeValues.filter(isTargetRef).map(targetSignature);
  if (namedRoutes.length === 0 && routeTargets.length === 0) {
    return targets;
  }
  return targets.filter((targetRef) => {
    const signature = targetSignature(targetRef);
    return (
      routeTargets.includes(signature) ||
      namedRoutes.some(
        (name) =>
          targetRef.label === name ||
          targetRef.key === name ||
          signature === name ||
          signature.includes(name) ||
          `${targetRef.adapter}:${targetRef.key}` === name
      )
    );
  });
}

function previewConfidenceForTargets(
  targets: TargetRef[]
): Array<{ target: TargetRef; confidence: PreviewConfidence; reasons: string[] }> {
  return targets.map((targetRef) => {
    const reasons: string[] = [];
    let confidence: PreviewConfidence = "exact";
    if (targetRef.key.includes("*") || Boolean(targetRef.meta?.pattern)) {
      confidence = "unsafe";
      reasons.push("wildcard target");
    } else if (["search", "http", "cdn", "job", "queue", "socket"].includes(targetRef.adapter)) {
      confidence = "estimated";
      reasons.push("external system confirms final effect");
    }
    if (targetRef.adapter === "manifest") {
      confidence = "unknown";
      reasons.push("loaded from manifest without runtime target details");
    }
    return { target: targetRef, confidence, reasons: reasons.length ? reasons : ["deterministic target"] };
  });
}

function summarizePreviewConfidence(
  targetConfidence: Array<{ target: TargetRef; confidence: PreviewConfidence; reasons: string[] }>
): PreviewConfidence {
  if (targetConfidence.some((item) => item.confidence === "unsafe")) {
    return "unsafe";
  }
  if (targetConfidence.some((item) => item.confidence === "unknown")) {
    return "unknown";
  }
  if (targetConfidence.some((item) => item.confidence === "estimated")) {
    return "estimated";
  }
  return "exact";
}

function builtInLintFindings(
  manifest: Manifest,
  mutations: Map<string, MutationDefinition>,
  mirrors: Map<string, MirrorRecord>,
  adapters: Map<string, Adapter>,
  approvalGates: Map<string, ApprovalConfig>
): GraphLintFinding[] {
  const findings: GraphLintFinding[] = [];
  for (const [name, item] of Object.entries(manifest.mutations)) {
    const definition = mutations.get(name);
    if (!definition?.schema) {
      findings.push({ rule: "missing-schema", severity: "warn", subject: name, message: "mutation has no schema" });
    }
    if (!definition?.owner) {
      findings.push({ rule: "missing-owner", severity: "warn", subject: name, message: "mutation has no owner" });
    }
    if (item.mirrors.length === 0) {
      findings.push({ rule: "no-targets", severity: "info", subject: name, message: "mutation has no targets" });
    }
    if (item.mirrors.length > 50) {
      findings.push({ rule: "too-many-targets", severity: "warn", subject: name, message: `${item.mirrors.length} targets may need batching or coalescing` });
    }
    if (/delete|purge|tenant/i.test(name) && !approvalGates.has(name)) {
      findings.push({ rule: "missing-approval", severity: "error", subject: name, message: "destructive mutation has no approval gate" });
    }
  }
  for (const [name, mirror] of mirrors) {
    if (!mirror.definition.owner) {
      findings.push({ rule: "target-missing-owner", severity: "warn", subject: name, message: "target has no owner" });
    }
    if (mirror.definition.when.length === 0) {
      findings.push({ rule: "unreachable-target", severity: "error", subject: name, message: "target is never reached" });
    }
    if (/redis/i.test(name) && /(^\*$|:\*$|\*)/.test(name)) {
      findings.push({ rule: "unsafe-redis-pattern", severity: "error", subject: name, message: "Redis wildcard target requires an explicit sandbox" });
    }
    if (/http|webhook/i.test(name) && !/allow|safe|signed/i.test(name)) {
      findings.push({ rule: "http-allowlist", severity: "warn", subject: name, message: "HTTP target should document allowlist and signing" });
    }
  }
  const usedAdapters = new Set([...mirrors.keys()].map(inferAdapterFromMirrorName));
  for (const adapter of adapters.keys()) {
    if (!usedAdapters.has(adapter)) {
      findings.push({ rule: "unused-adapter", severity: "info", subject: adapter, message: "adapter is registered but not used by the graph" });
    }
  }
  return findings;
}

async function asyncFlatMap<T, TResult>(items: T[], task: (item: T) => MaybePromise<TResult[]>): Promise<TResult[]> {
  const nested = await Promise.all(items.map(task));
  return nested.flat();
}

function heatmapFromReceipts(receipts: Receipt[]): HeatmapReport {
  const mutationGroups = groupBy(receipts, (receipt) => receipt.mutation);
  const hotMutations = [...mutationGroups.entries()]
    .map(([mutation, group]) => ({
      mutation,
      count: group.length,
      failureRate: ratio(group.filter((receipt) => receipt.status === "failed" || receipt.status === "partial").length, group.length),
      p95Ms: percentile(group.map((receipt) => receipt.durationMs), 95),
      riskScore: Math.max(...group.map((receipt) => receipt.risk?.score ?? 0), 0),
      costScore: Math.max(...group.map((receipt) => receipt.cost?.score ?? 0), 0),
      owner: group.find((receipt) => receipt.owner)?.owner
    }))
    .sort((left, right) => right.count - left.count);
  const targetResults = receipts.flatMap((receipt) => receipt.results);
  const targetGroups = groupBy(targetResults, (result) => `${result.adapter}:${result.key}`);
  const slowTargets = [...targetGroups.entries()]
    .map(([targetName, group]) => ({
      target: targetName,
      count: group.length,
      p95Ms: percentile(group.map((result) => result.durationMs), 95),
      failureRate: ratio(group.filter((result) => result.status === "failed").length, group.length)
    }))
    .sort((left, right) => right.p95Ms - left.p95Ms);
  const adapterGroups = groupBy(targetResults, (result) => result.adapter);
  const adapterVolume = [...adapterGroups.entries()]
    .map(([adapter, group]) => ({
      adapter,
      count: group.length,
      failureRate: ratio(group.filter((result) => result.status === "failed").length, group.length)
    }))
    .sort((left, right) => right.count - left.count);
  return { hotMutations, slowTargets, adapterVolume };
}

function optimizationSuggestions(receipts: Receipt[]): OptimizationReport["suggestions"] {
  const suggestions: OptimizationReport["suggestions"] = [];
  const allTargets = receipts.flatMap((receipt) => receipt.targets.map((targetRef) => ({ receipt, targetRef })));
  const targetGroups = groupBy(allTargets, (item) => targetSignature(item.targetRef));
  for (const [signature, group] of targetGroups) {
    if (group.length >= 3) {
      suggestions.push({
        title: `${signature} repeats across ${group.length} receipts`,
        suggestion: "coalesce this target for 250-500ms or batch it by adapter",
        estimatedReduction: Math.min(90, Math.round((1 - 1 / group.length) * 100)),
        target: signature
      });
    }
  }
  for (const receipt of receipts) {
    if (receipt.targets.length > 25) {
      suggestions.push({
        title: `${receipt.mutation} has a broad blast radius`,
        suggestion: "split targets into required and optional groups, then add field-level routing",
        estimatedReduction: 25,
        mutation: receipt.mutation
      });
    }
    if (receipt.targets.some((targetRef) => targetRef.adapter === "socket" && /all|tenant|broadcast/i.test(targetRef.key))) {
      suggestions.push({
        title: `${receipt.mutation} broadcasts a socket target`,
        suggestion: "narrow the room to the affected entity or actor",
        estimatedReduction: 40,
        mutation: receipt.mutation
      });
    }
  }
  return suggestions.slice(0, 10);
}

function badgeSvg(label: string, message: string, color: string): string {
  const labelWidth = Math.max(72, label.length * 7 + 12);
  const messageWidth = Math.max(72, message.length * 7 + 12);
  const width = labelWidth + messageWidth;
  const safeLabel = escapeXml(label);
  const safeMessage = escapeXml(message);
  const safeColor = escapeXml(color);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="20" role="img" aria-label="${safeLabel}: ${safeMessage}"><linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient><rect rx="3" width="${width}" height="20" fill="#111827"/><rect rx="3" x="${labelWidth}" width="${messageWidth}" height="20" fill="${safeColor}"/><rect width="${width}" height="20" fill="url(#s)"/><g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,sans-serif" font-size="11"><text x="${Math.floor(labelWidth / 2)}" y="14">${safeLabel}</text><text x="${labelWidth + Math.floor(messageWidth / 2)}" y="14">${safeMessage}</text></g></svg>`;
}

function humanTarget(targetRef: TargetRef): string {
  if (targetRef.adapter === "redis") return `Redis ${targetRef.key}`;
  if (targetRef.adapter === "query") return `query ${targetRef.key}`;
  if (targetRef.adapter === "next") return `Next ${targetRef.key}`;
  if (targetRef.adapter === "socket") return `socket room ${targetRef.key}`;
  if (targetRef.adapter === "search") return `search ${targetRef.key}`;
  return `${targetRef.adapter} ${targetRef.key}`;
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const groupKey = key(item);
    groups.set(groupKey, [...(groups.get(groupKey) ?? []), item]);
  }
  return groups;
}

function percentile(values: number[], percentileRank: number): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.ceil((percentileRank / 100) * sorted.length) - 1);
  return sorted[index] ?? 0;
}

function ratio(count: number, total: number): number {
  return total === 0 ? 0 : Number((count / total).toFixed(4));
}

function stableHash(value: unknown): string {
  const input = JSON.stringify(value, Object.keys(isRecord(value) ? value : {}).sort());
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16);
}

function rolloutBucket(seed: string): number {
  return Number.parseInt(stableHash(seed).slice(0, 8), 16) % 100;
}

function escapeXml(value: string): string {
  return value.replace(/[<>&"]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[char] ?? char);
}

function isSafeReplayTarget(targetRef: TargetRef): boolean {
  if (targetRef.idempotent === true || targetRef.meta?.idempotent === true) {
    return true;
  }
  return ["delete", "invalidate", "refetch", "revalidate", "remove"].includes(targetRef.action);
}

function inferAdapterFromMirrorName(name: string): string {
  const [first] = name.split(":");
  if (!first) {
    return "unknown";
  }
  const lowered = first.toLowerCase();
  for (const adapter of ["redis", "query", "swr", "next", "socket", "http", "search", "redux", "zustand", "apollo"]) {
    if (lowered.includes(adapter)) {
      return adapter;
    }
  }
  return lowered;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function patternMatches(pattern: string, value: string): boolean {
  if (pattern === value) {
    return true;
  }
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replaceAll("*", ".*");
  return new RegExp(`^${escaped}$`).test(value);
}

function assertSafeHttpTarget(targetRef: TargetRef): void {
  let url: URL;
  try {
    url = new URL(targetRef.key);
  } catch {
    throw new Error(`Blocked HTTP target ${targetRef.key}: invalid URL`);
  }
  const meta = isRecord(targetRef.meta) ? targetRef.meta : {};
  const requireHttps = meta.requireHttps !== false;
  if (requireHttps && url.protocol !== "https:") {
    throw new Error(`Blocked HTTP target ${targetRef.key}: HTTPS is required`);
  }
  const allowHosts = Array.isArray(meta.allowHosts) ? meta.allowHosts.map(String) : undefined;
  if (allowHosts && !allowHosts.includes(url.hostname)) {
    throw new Error(`Blocked HTTP target ${targetRef.key}: host is not allowed`);
  }
  const blockLocalhost = meta.blockLocalhost !== false;
  if (blockLocalhost && ["localhost", "127.0.0.1", "::1", "0.0.0.0"].includes(url.hostname)) {
    throw new Error(`Blocked HTTP target ${targetRef.key}: localhost is not allowed`);
  }
  const blockPrivateIps = meta.blockPrivateIps !== false;
  if (blockPrivateIps && isPrivateHost(url.hostname)) {
    throw new Error(`Blocked HTTP target ${targetRef.key}: private network target is not allowed`);
  }
}

function isPrivateHost(hostname: string): boolean {
  if (hostname === "169.254.169.254") {
    return true;
  }
  const parts = hostname.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return false;
  }
  const [first, second] = parts as [number, number, number, number];
  return first === 10 || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168) || first === 127;
}

async function mapLimit<T, TResult>(
  items: T[],
  limit: number,
  task: (item: T, index: number) => MaybePromise<TResult>
): Promise<TResult[]> {
  const results = new Array<TResult>(items.length);
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await task(items[index] as T, index);
    }
  }

  const workerCount = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

async function withTimeout<T>(task: () => MaybePromise<T>, timeoutMs: number, label: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve().then(task),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
      })
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

function receiptStatus(results: ExecutionResult[]): "success" | "partial" | "failed" {
  const failures = results.filter((result) => result.status === "failed");
  if (failures.length === 0) {
    return "success";
  }
  if (failures.length === results.length) {
    return "failed";
  }
  return "partial";
}

function serializeError(error: unknown): { name: string; message: string; stack?: string } {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return { name: "Error", message: String(error) };
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return JSON.stringify(error);
}

function sleep(ms: number): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function redactValue(
  value: unknown,
  keys: Set<string>,
  custom: ((key: string, value: unknown, path: string[]) => unknown) | undefined,
  path: string[] = []
): unknown {
  if (Array.isArray(value)) {
    return value.map((item, index) => redactValue(item, keys, custom, [...path, String(index)]));
  }
  if (!value || typeof value !== "object") {
    return value;
  }
  const output: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value)) {
    const nestedPath = [...path, key];
    output[key] = keys.has(key)
      ? "[redacted]"
      : custom
        ? custom(key, redactValue(nested, keys, custom, nestedPath), nestedPath)
        : redactValue(nested, keys, custom, nestedPath);
  }
  return output;
}
