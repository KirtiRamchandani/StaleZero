import type {
  ChangedOptions,
  CommandDefinition,
  EntityRef,
  MirrorDefinition,
  SecurityConfig,
  StaleZeroConfig,
  TargetRef,
  UndeclaredMutationPolicy
} from "../types.js";

export type MirrorRecord = {
  name: string;
  definition: MirrorDefinition;
};

export type CommandRecord = {
  name: string;
  definition: CommandDefinition;
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

export type ResolvedConfig = Omit<StaleZeroConfig, "execution" | "distributed" | "receipts" | "security" | "devtools"> & {
  execution: ResolvedExecutionConfig;
  distributed: Required<NonNullable<StaleZeroConfig["distributed"]>>;
  receipts: ResolvedReceiptConfig;
  security?: SecurityConfig;
  devtools: Required<NonNullable<StaleZeroConfig["devtools"]>>;
  allowUndeclaredMutations: UndeclaredMutationPolicy;
};

export type ExecuteRequest = {
  mutation: string;
  input: unknown;
  explicitTargets?: TargetRef[];
  explicitAffected?: EntityRef[];
  options?: ChangedOptions;
};

export type CircuitState = {
  failures: number;
  openUntil: number;
};
