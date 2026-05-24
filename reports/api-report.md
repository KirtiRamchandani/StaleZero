# Public API Report

Generated from built declaration files.

## Stability Map

| Surface | Stability |
| --- | --- |
| createStaleZero() | Stable |
| changed() | Stable |
| preview() | Stable |
| snapshot(), compareSnapshots(), replay() | Stable |
| contract() mutation behavior tests | Stable |
| receipts | Stable |
| memory adapter | Stable |
| Redis adapter | Stable |
| React Query adapter | Stable |
| SWR adapter | Stable |
| Next adapter | Stable/server-only |
| Redux, RTK Query, tRPC, Zustand, Apollo, GraphQL adapters | Stable |
| Cloudflare KV, WebSocket, search, HTTP adapters | Stable |
| Memory, Redis, Postgres, Kafka, NATS, HTTP buses | Stable |
| 52 target helper catalog | Stable |
| Mutation Studio data API and devtools handler | Stable |
| CLI | Stable |

## Package Export Counts

| Package | Export lines | Declaration |
| --- | --- | --- |
| @stalezero/apollo | 4 | index.d.ts |
| @stalezero/cloudflare-kv | 5 | index.d.ts |
| @stalezero/graphql | 6 | index.d.ts |
| @stalezero/http | 2 | index.d.ts |
| @stalezero/memory | 4 | index.d.ts |
| @stalezero/next | 3 | index.d.ts |
| @stalezero/react-query | 3 | index.d.ts |
| @stalezero/redis | 3 | index.d.ts |
| @stalezero/redux | 8 | index.d.ts |
| @stalezero/rtk-query | 7 | index.d.ts |
| @stalezero/search | 6 | index.d.ts |
| @stalezero/swr | 3 | index.d.ts |
| @stalezero/trpc | 5 | index.d.ts |
| @stalezero/websocket | 4 | index.d.ts |
| @stalezero/zustand | 3 | index.d.ts |
| @stalezero/http-bus | 4 | index.d.ts |
| @stalezero/kafka-bus | 3 | index.d.ts |
| @stalezero/memory-bus | 3 | index.d.ts |
| @stalezero/nats-bus | 2 | index.d.ts |
| @stalezero/postgres-bus | 9 | index.d.ts |
| @stalezero/redis-bus | 4 | index.d.ts |
| @stalezero/cli | 1 | index.d.ts |
| @stalezero/core | 7 | index.d.ts |
| create-stalezero-adapter-template | 4 | index.d.ts |
| @stalezero/devtools | 11 | index.d.ts |
| @stalezero/github-action | 6 | index.d.ts |
| @stalezero/otel | 7 | index.d.ts |
| @stalezero/pack-auth | 2 | index.d.ts |
| @stalezero/pack-commerce | 2 | index.d.ts |
| @stalezero/pack-saas | 2 | index.d.ts |
| @stalezero/recipes | 5 | index.d.ts |
| @stalezero/snapshot | 7 | index.d.ts |
| stalezero | 30 | index.d.ts |
| @stalezero/testing | 11 | index.d.ts |

## @stalezero/apollo

```ts
export type ApolloClientLike = {
export type ApolloCacheLike = {
export type ApolloAdapterOptions = {
export declare function apolloAdapter(client: ApolloClientLike, options?: ApolloAdapterOptions): Adapter<TargetRef<"apollo">>;
```
## @stalezero/cloudflare-kv

```ts
export type KvNamespaceLike = {
export type CloudflareKvAdapterOptions = {
export declare function cloudflareKvAdapter(options: CloudflareKvAdapterOptions): Adapter<TargetRef<"cloudflare-kv">>;
export declare function kvTarget(key: string, options?: Omit<TargetRef<"cloudflare-kv">, "adapter" | "key" | "action">): TargetRef<"cloudflare-kv">;
export declare function kvPrefixTarget(prefix: string, options?: Omit<TargetRef<"cloudflare-kv">, "adapter" | "key" | "action">): TargetRef<"cloudflare-kv">;
```
## @stalezero/graphql

```ts
export type GraphqlCacheLike = {
export type GraphqlTarget = TargetRef<"graphql"> & {
export type GraphqlAdapterOptions = {
export declare function graphqlAdapter(options: GraphqlAdapterOptions): Adapter<GraphqlTarget>;
export declare function graphqlTarget(operation: string, options?: Omit<GraphqlTarget, "adapter" | "key" | "action"> & {
export declare function graphqlEntityTarget(entity: string, id: string, options?: Omit<GraphqlTarget, "adapter" | "key" | "action">): GraphqlTarget;
```
## @stalezero/http

```ts
export type HttpAdapterOptions = {
export declare function httpAdapter(options?: HttpAdapterOptions): Adapter<TargetRef<"http">>;
```
## @stalezero/memory

```ts
export type MemoryCall = {
export type MemoryAdapter = Adapter & {
export declare function memoryAdapter(name?: string): MemoryAdapter;
export declare function memoryTarget(key: string, options?: Omit<TargetRef<"memory">, "adapter" | "key" | "action">): TargetRef<"memory">;
```
## @stalezero/next

```ts
export type NextCacheFunctions = {
export type NextCacheAdapterOptions = NextCacheFunctions & {
export declare function nextCacheAdapter(options?: NextCacheAdapterOptions): Adapter<TargetRef<"next">>;
```
## @stalezero/react-query

```ts
export type QueryClientLike = {
export type ReactQueryAdapterOptions = {
export declare function reactQueryAdapter(client: QueryClientLike, options?: ReactQueryAdapterOptions): Adapter<TargetRef<"query">>;
```
## @stalezero/redis

```ts
export type RedisClientLike = {
export type RedisAdapterOptions = {
export declare function redisAdapter(client: RedisClientLike, options?: RedisAdapterOptions): Adapter<TargetRef<"redis">>;
```
## @stalezero/redux

```ts
export type ReduxStoreLike = {
export type ReduxActionMapper = (target: TargetRef<"redux">, context: MutationContext) => unknown;
export type ReduxAdapterOptions = {
export declare const STALEZERO_INVALIDATE = "stalezero/invalidate";
export declare const STALEZERO_PATCH = "stalezero/patch";
export declare const STALEZERO_REMOVE = "stalezero/remove";
export declare function reduxAdapter(store: ReduxStoreLike, options?: ReduxAdapterOptions): Adapter<TargetRef<"redux">>;
export declare function staleZeroReducer<State extends Record<string, unknown>>(state: State | undefined, action: unknown): State;
```
## @stalezero/rtk-query

```ts
export type RtkQueryApiLike = {
export type RtkQueryStoreLike = {
export type RtkQueryAdapterOptions = {
export type RtkQueryTargetOptions = Omit<TargetRef<"rtk-query">, "adapter" | "key" | "action"> & {
export declare function rtkQueryAdapter(options: RtkQueryAdapterOptions): Adapter<TargetRef<"rtk-query">>;
export declare function rtkQueryTarget(tags: unknown[] | string, options?: RtkQueryTargetOptions): TargetRef<"rtk-query">;
export declare function rtkQueryEndpointTarget(endpoint: string, arg?: unknown, options?: RtkQueryTargetOptions): TargetRef<"rtk-query">;
```
## @stalezero/search

```ts
export type SearchJob = {
export type SearchQueueLike = {
export type SearchAdapterOptions = {
export declare function searchAdapter(options: SearchAdapterOptions): Adapter<TargetRef<"search">>;
export declare function meilisearchHandler(client: {
export declare function algoliaHandler(client: {
```
## @stalezero/swr

```ts
export type SwrMutateLike = (key: unknown, data?: unknown, options?: unknown) => Promise<unknown> | unknown;
export type SwrAdapterOptions = {
export declare function swrAdapter(mutateOrOptions?: SwrMutateLike | SwrAdapterOptions): Adapter<TargetRef<"swr">>;
```
## @stalezero/trpc

```ts
export type TrpcUtilsLike = Record<string, unknown>;
export type TrpcAdapterOptions = {
export type TrpcTargetOptions = Omit<TargetRef<"trpc">, "adapter" | "key" | "action"> & {
export declare function trpcAdapter(options: TrpcAdapterOptions): Adapter<TargetRef<"trpc">>;
export declare function trpcTarget(path: string | string[], options?: TrpcTargetOptions): TargetRef<"trpc">;
```
## @stalezero/websocket

```ts
export type SocketIoLike = {
export type WsClientLike = {
export type WebSocketAdapterOptions = {
export declare function websocketAdapter(options: SocketIoLike | WebSocketAdapterOptions): Adapter<TargetRef<"socket">>;
```
## @stalezero/zustand

```ts
export type ZustandStoreLike<State extends Record<string, unknown> = Record<string, unknown>> = {
export type ZustandAdapterOptions<State extends Record<string, unknown> = Record<string, unknown>> = {
export declare function zustandAdapter<State extends Record<string, unknown>>(store: ZustandStoreLike<State>, options?: ZustandAdapterOptions<State>): Adapter<TargetRef<"zustand">>;
```
## @stalezero/http-bus

```ts
export type HttpBusOptions = {
export type HttpBusHandlerOptions = {
export declare function httpWebhookBus(options: HttpBusOptions): EventBus;
export declare function createHttpBusHandler(handler: (event: StaleEvent) => Promise<void> | void, options?: HttpBusHandlerOptions): (request: Request) => Promise<Response>;
```
## @stalezero/kafka-bus

```ts
export type KafkaProducerLike = {
export type KafkaConsumerLike = {
export declare function kafkaBus(options: {
```
## @stalezero/memory-bus

```ts
export type MemoryBus = EventBus & {
export type MemoryBusOptions = {
export declare function memoryBus(options?: string | MemoryBusOptions): MemoryBus;
```
## @stalezero/nats-bus

```ts
export type NatsConnectionLike = {
export declare function natsBus(options: {
```
## @stalezero/postgres-bus

```ts
export type PgClientLike = {
export declare const POSTGRES_OUTBOX_SCHEMA = "\nCREATE TABLE IF NOT EXISTS stalezero_outbox (\n  id UUID PRIMARY KEY,\n  app TEXT NOT NULL,\n  mutation TEXT NOT NULL,\n  payload JSONB NOT NULL,\n  affected JSONB NOT NULL,\n  status TEXT NOT NULL DEFAULT 'pending',\n  attempts INT NOT NULL DEFAULT 0,\n  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),\n  processed_at TIMESTAMPTZ\n);\n";
export declare function postgresNotifyBus(options: {
export declare function insertOutboxEvent(client: PgClientLike, event: StaleEvent): Promise<void>;
export declare function fetchPendingOutboxEvents(client: PgClientLike, options?: {
export declare function markOutboxEventProcessed(client: PgClientLike, id: string): Promise<void>;
export declare function markOutboxEventFailed(client: PgClientLike, id: string): Promise<void>;
export declare function cleanupOutbox(client: PgClientLike, options?: {
export declare function replayOutbox(client: PgClientLike, handler: (event: StaleEvent) => Promise<void> | void, options?: {
```
## @stalezero/redis-bus

```ts
export type RedisPubSubClientLike = {
export type RedisStreamClientLike = {
export declare function redisPubSubBus(options: {
export declare function redisStreamBus(options: {
```
## @stalezero/cli

```ts
export {};
```
## @stalezero/core

```ts
export { createStaleZero, QuickMutationBuilder, StaleZeroEngine, StaleZeroExecutionError, StaleZeroFlowBuilder, StaleZeroResourceBuilder } from "./engine.js";
export type { AutopilotRecipeOptions, CommandInput, MutationInput, ReceiptsApi, StaleZero } from "./engine.js";
export { createId } from "./ids.js";
export { createReceipt, receiptToText } from "./receipt.js";
export { MemoryReceiptStore } from "./store.js";
export { analyticsTarget, apolloTarget, auditLogTarget, billingTarget, blobTarget, broadcastChannelTarget, browserCacheTarget, bunSqliteTarget, cartTarget, catalogTarget, cdnPurgeTarget, cdnTarget, checkoutTarget, cloudflareCacheTarget, cloudfrontTarget, customTarget, cookieTarget, cronTarget, deadLetterTarget, denoKvTarget, drizzleTarget, edgeConfigTarget, emailTarget, entity, fastlyTarget, featureFlagTarget, httpTarget, imageCacheTarget, indexTarget, inventoryTarget, jobTarget, localStorageTarget, metricsTarget, mongoTarget, nextPathTarget, nextTagTarget, netlifyCacheTarget, objectStorageTarget, orderTarget, outboxTarget, permissionTarget, postgresNotifyTarget, prismaTarget, pushTarget, queryTarget, queueTarget, redisPatternTarget, redisTarget, roleTarget, reduxTarget, s3Target, searchTarget, sequelizeTarget, serviceWorkerTarget, sessionTarget, smsTarget, socketTarget, streamTarget, stripeTarget, swrTarget, target, tenantTarget, topicTarget, typeormTarget, vercelCacheTarget, webhookTarget, workflowTarget, zustandTarget } from "./targets.js";
export type { Adapter, ApprovalConfig, AuditEvent, BadgeResult, BlackboxConfig, BlackboxEntry, BrowserHelperOptions, CanaryResult, ChaosConfig, ChangedOptions, CommandDefinition, CompiledManifest, ConsistencyProfile, ConsistencyMode, CoalesceConfig, CostReport, Diagnostic, DistributedConfig, DriftApi, DriftFinding, DriftProbe, DriftReport, EntityRef, EventBus, ExplainStaleReport, ExecutionConfig, ExecutionResult, ExecutionStatus, FlowResult, FlowStepOptions, FlowStepReceipt, FreshnessBudget, FreshnessStatus, GraphLintFinding, GraphLintReport, GraphLintRule, GraphLintSeverity, HeatmapReport, HumanReceipt, JsonPrimitive, JsonValue, Manifest, MaybePromise, MarketplaceEntry, MirrorDefinition, MutationContract, MutationContractResult, MutationContext, MutationDefinition, MutationSnapshot, MutationSnapshotData, NotifyConfig, OptimizationReport, OwnershipMap, Preview, PreviewConfidence, ProjectScore, ProofResult, RateLimitConfig, Receipt, ReceiptConfig, ReceiptSnapshot, ReceiptStatus, ReceiptStore, RecipeInstaller, RedactionOptions, ReplayOptions, ReplayMode, ReplayResult, ResourceBuilderApi, ResourceDefinition, ResourceRecipe, RiskConfig, RiskLevel, RiskResult, SandboxConfig, SchemaLike, SchemaDiff, SchemaRegistryApi, SecurityConfig, ServiceContract, ServiceContractReport, ShadowConfig, SloConfig, SloEvaluation, SnapshotDiff, SnapshotDiffData, StateProof, RolloutConfig, Runbook, StaleEvent, StaleZeroHooks, StaleZeroConfig, StudioApi, StudioOptions, TemplateDefinition, TenantConfig, TargetAction, TargetRef, TimeMachineApi, TimeMachineSearchOptions, UndoPreview, UndoResult, UndoableDefinition, UndoReceiptInfo, WorkflowResult, WorkflowStep, WorkflowStepRunner, WhyResult } from "./types.js";
```
## create-stalezero-adapter-template

```ts
export type AdapterTemplateOptions = {
export type TemplateFile = {
export declare function adapterTemplateFiles(options?: AdapterTemplateOptions): TemplateFile[];
export declare function writeAdapterTemplate(directory: string, options?: AdapterTemplateOptions): Promise<TemplateFile[]>;
```
## @stalezero/devtools

```ts
export type DevtoolsOptions = {
export type DevtoolsSnapshot = {
export declare function devtoolsSnapshot(stale: StaleZero, options?: DevtoolsOptions): Promise<DevtoolsSnapshot>;
export declare function createDevtoolsHandler(stale: StaleZero): (request: unknown, response?: unknown) => Promise<unknown>;
export declare function createDevtoolsWebHandler(stale: StaleZero, options?: DevtoolsOptions): (request: Request) => Promise<Response>;
export declare function createExpressDevtoolsHandler(stale: StaleZero, options?: DevtoolsOptions): (request: {
export declare function createFastifyDevtoolsHandler(stale: StaleZero, options?: DevtoolsOptions): (request: {
export declare const createNextDevtoolsHandler: typeof createDevtoolsWebHandler;
export declare function StaleZeroPanel(props: {
export declare function createReactDevtoolsPanel(react: {
export declare function renderStaticDevtoolsHtml(snapshot: DevtoolsSnapshot): string;
```
## @stalezero/github-action

```ts
export type ManifestDiff = {
export type SecurityFinding = {
export declare function diffManifests(before: Manifest, after: Manifest): ManifestDiff;
export declare function mutationDiffMarkdown(diff: ManifestDiff): string;
export declare function inspectManifestSecurity(manifest: Manifest): SecurityFinding[];
export declare function securityInspectorMarkdown(findings: SecurityFinding[]): string;
```
## @stalezero/otel

```ts
export type SpanLike = {
export declare const spanNames: {
export declare const eventNames: {
export declare function receiptAttributes(receipt: Receipt): Record<string, string | number | boolean>;
export declare function applyReceiptToSpan(span: SpanLike, receipt: Receipt): void;
export type TracerLike = {
export declare function createOpenTelemetryHooks(tracer: TracerLike): StaleZeroHooks;
```
## @stalezero/pack-auth

```ts
export declare function authPack(stale: StaleZero): void;
export default authPack;
```
## @stalezero/pack-commerce

```ts
export declare function commercePack(stale: StaleZero): void;
export default commercePack;
```
## @stalezero/pack-saas

```ts
export declare function saasPack(stale: StaleZero): void;
export default saasPack;
```
## @stalezero/recipes

```ts
export type ProductCatalogRecipeOptions = {
export type UserProfileRecipeOptions = {
export declare const recipe: {
export declare const template: {
export {};
```
## @stalezero/snapshot

```ts
export type SnapshotFileOptions = {
export declare function createMutationSnapshot(stale: Pick<StaleZero, "snapshot">, mutation: string, input: unknown): Promise<MutationSnapshot>;
export declare function writeMutationSnapshot(stale: Pick<StaleZero, "snapshot">, mutation: string, input: unknown, options?: SnapshotFileOptions): Promise<{
export declare function readMutationSnapshot(path: string): Promise<MutationSnapshotData>;
export declare function compareSnapshotFiles(stale: Pick<StaleZero, "compareSnapshots">, beforePath: string, afterPath: string): Promise<SnapshotDiff>;
export declare function snapshotMarkdown(snapshot: MutationSnapshotData): string;
export declare function snapshotDiffMarkdown(diff: Pick<SnapshotDiff, "mutation" | "added" | "removed" | "risk">): string;
```
## stalezero

```ts
export * from "@stalezero/core";
export * from "@stalezero/memory";
export * from "@stalezero/redis";
export * from "@stalezero/redux";
export * from "@stalezero/react-query";
export * from "@stalezero/rtk-query";
export * from "@stalezero/swr";
export * from "@stalezero/trpc";
export * from "@stalezero/next";
export * from "@stalezero/apollo";
export * from "@stalezero/zustand";
export * from "@stalezero/graphql";
export * from "@stalezero/cloudflare-kv";
export * from "@stalezero/http";
export * from "@stalezero/websocket";
export * from "@stalezero/search";
export * from "@stalezero/memory-bus";
export * from "@stalezero/redis-bus";
export * from "@stalezero/postgres-bus";
export * from "@stalezero/http-bus";
export * from "@stalezero/kafka-bus";
export * from "@stalezero/nats-bus";
export * from "@stalezero/devtools";
export * from "@stalezero/otel";
export * from "@stalezero/snapshot";
export * from "@stalezero/github-action";
export * from "@stalezero/recipes";
export * from "@stalezero/pack-saas";
export * from "@stalezero/pack-commerce";
export * from "@stalezero/pack-auth";
```
## @stalezero/testing

```ts
export type TestStaleZero = {
export declare function createTestStaleZero(): TestStaleZero;
export declare function fakeReceiptStore(): ReceiptStore & {
export declare function expectReceipt(receipt: Receipt): {
export declare function adapterSpy(name?: string): MemoryAdapter;
export declare function createEcommerceFixture(): {
export type AdapterContractOptions = {
export declare function runAdapterContract(adapterOrOptions: Adapter | AdapterContractOptions): Promise<void>;
export declare function adapterContractSuite(options: AdapterContractOptions): Array<{
export declare const vitestMatchers: {
export declare const jestMatchers: {
```