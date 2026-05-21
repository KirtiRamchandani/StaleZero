import type { Adapter, TargetRef } from "@stalezero/core";

export type ZustandStoreLike<State extends Record<string, unknown> = Record<string, unknown>> = {
  getState: () => State;
  setState: (next: Partial<State> | ((state: State) => Partial<State>), replace?: boolean) => void;
};

export type ZustandAdapterOptions<State extends Record<string, unknown> = Record<string, unknown>> = {
  name?: string;
  resetValue?: unknown;
  setter?: (store: ZustandStoreLike<State>, target: TargetRef<"zustand">) => void;
};

export function zustandAdapter<State extends Record<string, unknown>>(
  store: ZustandStoreLike<State>,
  options: ZustandAdapterOptions<State> = {}
): Adapter<TargetRef<"zustand">> {
  return {
    name: options.name ?? "zustand",
    execute: (target) => {
      if (target.action !== "patch" && target.action !== "remove" && target.action !== "invalidate") {
        throw new Error(`Zustand adapter does not support ${target.action}`);
      }
      if (options.setter) {
        options.setter(store, target);
        return;
      }

      const value = target.action === "patch" ? target.meta?.value : options.resetValue;
      store.setState((state) => setPath(state, target.key, value));
    }
  };
}

function setPath<State extends Record<string, unknown>>(state: State, path: string, value: unknown): Partial<State> {
  const next = { ...state } as Record<string, unknown>;
  let cursor = next;
  const parts = path.split(".");
  for (const part of parts.slice(0, -1)) {
    const current = cursor[part];
    cursor[part] = current && typeof current === "object" ? { ...(current as Record<string, unknown>) } : {};
    cursor = cursor[part] as Record<string, unknown>;
  }
  const last = parts.at(-1);
  if (last) {
    cursor[last] = value;
  }
  return next as Partial<State>;
}
