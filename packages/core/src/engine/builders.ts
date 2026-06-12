import type {
  ChangedOptions,
  EntityRef,
  ExecutionResult,
  FlowResult,
  FlowStepOptions,
  FlowStepReceipt,
  MaybePromise,
  Preview,
  Receipt,
  ResourceBuilderApi,
  ResourceDefinition,
  ResourceRecipe,
  TargetAction,
  TargetRef
} from "../types.js";
import { createId, now } from "../ids.js";
import { withTimeout } from "../timeout.js";
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
  zustandTarget
} from "../targets.js";
import { isRecord } from "../utils/collections.js";
import { serializeError } from "../utils/serialize.js";
import type { AutopilotRecipeOptions } from "./api.js";
import type { StaleZeroEngine } from "./StaleZeroEngine.js";

export class QuickMutationBuilder {
  readonly #engine: StaleZeroEngine;
  readonly #mutation: string;
  readonly #input: unknown;
  readonly #targets: TargetRef[] = [];
  readonly #affected: EntityRef[] = [];
  readonly #runOptions: ChangedOptions = {};

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

  dryRun(): this {
    this.#runOptions.dryRun = true;
    return this;
  }

  strict(): this {
    this.#runOptions.consistency = "strict";
    return this;
  }

  withActor(actor: unknown): this {
    this.#runOptions.actor = actor;
    return this;
  }

  withTenant(tenantId: string): this {
    this.#runOptions.actor = { tenantId };
    return this;
  }

  withTrace(traceId: string): this {
    this.#runOptions.traceId = traceId;
    return this;
  }

  prove(): this {
    this.#runOptions.prove = true;
    return this;
  }

  idempotencyKey(key: string): this {
    this.#runOptions.idempotencyKey = key;
    return this;
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
      options: { ...this.#runOptions, ...options }
    });
  }

  runStrict(options?: ChangedOptions): Promise<Receipt> {
    return this.strict().run({ ...options, consistency: "strict" });
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
        const task = (signal: AbortSignal) => {
          signal.throwIfAborted();
          return step.run(this.#input);
        };
        if (step.options?.timeoutMs) {
          await withTimeout(task, step.options.timeoutMs, `flow step ${step.name}`);
        } else {
          await task(new AbortController().signal);
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
      if (!this.#engine.hasMutation(mutation)) {
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
      }
      if (options.redis !== false && !this.#engine.hasMirror(`${mutation}:redis`)) {
        this.#engine.mirror(`${mutation}:redis`, {
          when: mutation,
          owner,
          target: (input: Record<string, unknown>) => redisTarget(`${entityName.toLowerCase()}:${idFrom(input)}`, { owner })
        });
      }
      if (options.reactQuery !== false && !this.#engine.hasMirror(`${mutation}:query`)) {
        this.#engine.mirror(`${mutation}:query`, {
          when: mutation,
          owner,
          target: (input: Record<string, unknown>) => queryTarget([entityName.toLowerCase(), idFrom(input)], { owner })
        });
      }
      if (options.nextTag !== false && !this.#engine.hasMirror(`${mutation}:next`)) {
        this.#engine.mirror(`${mutation}:next`, {
          when: mutation,
          owner,
          target: (input: Record<string, unknown>) => nextTagTarget(`${entityName.toLowerCase()}:${idFrom(input)}`, { owner })
        });
      }
      if (options.socket !== false && !this.#engine.hasMirror(`${mutation}:socket`)) {
        this.#engine.mirror(`${mutation}:socket`, {
          when: mutation,
          owner,
          target: (input: Record<string, unknown>) => socketTarget(`${entityName.toLowerCase()}:${idFrom(input)}`, { owner, event: `${entityName.toLowerCase()}.changed` })
        });
      }
      if (options.search && !this.#engine.hasMirror(`${mutation}:search`)) {
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
