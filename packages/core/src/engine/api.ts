import type {
  BadgeResult,
  BlackboxConfig,
  BrowserHelperOptions,
  CanaryResult,
  ChaosConfig,
  ChangedOptions,
  CommandDefinition,
  CompiledManifest,
  ConsistencyMode,
  ConsistencyProfile,
  CoalesceConfig,
  CostReport,
  Diagnostic,
  DriftApi,
  EntityRef,
  EventBus,
  ExplainStaleReport,
  FlowResult,
  FreshnessBudget,
  GraphLintReport,
  GraphLintRule,
  HeatmapReport,
  FreshnessSloDashboardReport,
  HumanReceipt,
  InboxApi,
  InboxConfig,
  Manifest,
  MarketplaceEntry,
  MirrorDefinition,
  MutationContract,
  MutationContractResult,
  MutationDefinition,
  MutationSnapshot,
  MutationSnapshotData,
  NotifyConfig,
  OptimizationReport,
  OwnershipMap,
  Playbook,
  Preview,
  ProjectScore,
  RateLimitConfig,
  Receipt,
  ReceiptStore,
  RecipeInstaller,
  RedactionOptions,
  ReplayOptions,
  ReplayResult,
  ResourceDefinition,
  RiskConfig,
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
  SnapshotDiff,
  StudioApi,
  StudioOptions,
  StaleZeroConfig,
  TargetRef,
  TemplateDefinition,
  TenantConfig,
  TimeMachineApi,
  UndoPreview,
  UndoResult,
  UndoableDefinition,
  WorkflowResult,
  WorkflowStepRunner,
  WhyResult
} from "../types.js";

type MutationMap = Record<string, unknown>;

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
  use(adapter: import("../types.js").Adapter): this;
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
  ): import("./builders.js").QuickMutationBuilder;
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
  ): import("./builders.js").StaleZeroFlowBuilder;
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
  freshnessSloDashboard(options?: { limit?: number }): Promise<FreshnessSloDashboardReport>;
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
    saasEntity: (options?: AutopilotRecipeOptions) => import("../types.js").ResourceRecipe;
    commerceProduct: (options?: AutopilotRecipeOptions) => import("../types.js").ResourceRecipe;
    authSession: (options?: AutopilotRecipeOptions) => import("../types.js").ResourceRecipe;
    webhook: (options?: AutopilotRecipeOptions) => import("../types.js").ResourceRecipe;
    searchBackedEntity: (options?: AutopilotRecipeOptions) => import("../types.js").ResourceRecipe;
    multiTenant: (options?: AutopilotRecipeOptions) => import("../types.js").ResourceRecipe;
    serverless: (options?: AutopilotRecipeOptions) => import("../types.js").ResourceRecipe;
  };
  diagnostics(): Diagnostic[];
  codeowners(): string;
  why(targetName: string, input?: unknown): Promise<WhyResult>;
  receipt(id: string): Promise<Receipt | undefined>;
  exportReceipts(options?: { mutation?: string }): Promise<Receipt[]>;
  useRecipe(recipe: RecipeInstaller<this>): Promise<this>;
  useTemplate<Input = unknown>(name: string, definition: TemplateDefinition<Input>): this;
  resource(name: string, definition: ResourceDefinition): import("./builders.js").StaleZeroResourceBuilder;
  compileManifest(): CompiledManifest;
  coalesce(config: CoalesceConfig): this;
  slo(name: string, config: SloConfig): this;
  devtools(options?: StudioOptions): StudioApi;
  security(config: SecurityConfig): this;
  tenant(config: TenantConfig): this;
  sandbox(adapter: string, config: SandboxConfig): this;
  redact(options: RedactionOptions): this;
  approval(name: string, config: import("../types.js").ApprovalConfig): this;
  risk(config: RiskConfig): this;
  rateLimit(name: string, config: RateLimitConfig): this;
  inbox(config?: InboxConfig): InboxApi;
  workflow<Input = unknown>(
    name: string,
    input: Input,
    run: (step: WorkflowStepRunner) => import("../types.js").MaybePromise<void>,
    options?: { idempotencyKey?: string }
  ): Promise<WorkflowResult>;
  blackbox(config: BlackboxConfig): this;
  blackboxEntries(): import("../types.js").BlackboxEntry[];
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
