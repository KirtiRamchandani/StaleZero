import type { Adapter, MutationContext, TargetRef } from "@stalezero/core";

export type ReduxStoreLike = {
  dispatch: (action: unknown) => unknown;
};

export type ReduxActionMapper = (target: TargetRef<"redux">, context: MutationContext) => unknown;

export type ReduxAdapterOptions = {
  name?: string;
  mapAction?: ReduxActionMapper;
};

export const STALEZERO_INVALIDATE = "stalezero/invalidate";
export const STALEZERO_PATCH = "stalezero/patch";
export const STALEZERO_REMOVE = "stalezero/remove";

export function reduxAdapter(store: ReduxStoreLike, options: ReduxAdapterOptions = {}): Adapter<TargetRef<"redux">> {
  return {
    name: options.name ?? "redux",
    execute: (target, context) => {
      if (!["invalidate", "patch", "remove"].includes(target.action)) {
        throw new Error(`Redux adapter does not support ${target.action}`);
      }
      store.dispatch(options.mapAction ? options.mapAction(target, context) : defaultAction(target, context));
    }
  };
}

export function staleZeroReducer<State extends Record<string, unknown>>(state: State = {} as State, action: unknown): State {
  if (!isAction(action)) {
    return state;
  }

  if (action.type === STALEZERO_PATCH && typeof action.payload.path === "string") {
    return setPath(state, action.payload.path, action.payload.value);
  }

  if ((action.type === STALEZERO_INVALIDATE || action.type === STALEZERO_REMOVE) && typeof action.payload.path === "string") {
    return setPath(state, action.payload.path, undefined);
  }

  return state;
}

function defaultAction(target: TargetRef<"redux">, context: MutationContext): unknown {
  if (target.action === "patch") {
    return { type: STALEZERO_PATCH, payload: { path: target.key, value: target.meta?.value, mutation: context.mutation } };
  }
  if (target.action === "remove") {
    return { type: STALEZERO_REMOVE, payload: { path: target.key, mutation: context.mutation } };
  }
  return { type: STALEZERO_INVALIDATE, payload: { path: target.key, mutation: context.mutation } };
}

function isAction(action: unknown): action is { type: string; payload: Record<string, unknown> } {
  return Boolean(action && typeof action === "object" && "type" in action && "payload" in action);
}

function setPath<State extends Record<string, unknown>>(state: State, path: string, value: unknown): State {
  const parts = path.split(".");
  const next = { ...state } as Record<string, unknown>;
  let cursor = next;
  for (const part of parts.slice(0, -1)) {
    const current = cursor[part];
    cursor[part] = current && typeof current === "object" ? { ...(current as Record<string, unknown>) } : {};
    cursor = cursor[part] as Record<string, unknown>;
  }
  const last = parts.at(-1);
  if (last) {
    if (value === undefined) {
      delete cursor[last];
    } else {
      cursor[last] = value;
    }
  }
  return next as State;
}
