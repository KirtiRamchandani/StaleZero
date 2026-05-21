import type { EntityRef, TargetAction, TargetRef } from "./types.js";

export function entity(type: string, id: string | number): EntityRef {
  return { type, id: String(id) };
}

export function target(
  adapter: string,
  key: string,
  action: TargetAction,
  options: Omit<TargetRef, "adapter" | "key" | "action"> = {}
): TargetRef {
  return { adapter, key, action, ...options };
}

export function redisTarget(key: string, options: Omit<TargetRef<"redis">, "adapter" | "key" | "action"> = {}): TargetRef<"redis"> {
  return target("redis", key, options.meta?.action === "expire" ? "custom" : "delete", options) as TargetRef<"redis">;
}

export function redisPatternTarget(
  pattern: string,
  options: Omit<TargetRef<"redis">, "adapter" | "key" | "action"> = {}
): TargetRef<"redis"> {
  return target("redis", pattern, "delete", { ...options, meta: { ...options.meta, pattern: true } }) as TargetRef<"redis">;
}

export function reduxTarget(path: string, options: Omit<TargetRef<"redux">, "adapter" | "key" | "action"> = {}): TargetRef<"redux"> {
  return target("redux", path, options.meta?.patch ? "patch" : "invalidate", options) as TargetRef<"redux">;
}

export function queryTarget(
  queryKey: unknown[],
  options: Omit<TargetRef<"query">, "adapter" | "key" | "action"> = {}
): TargetRef<"query"> {
  return target("query", JSON.stringify(queryKey), (options.meta?.action as TargetAction) ?? "invalidate", {
    ...options,
    meta: { ...options.meta, queryKey }
  }) as TargetRef<"query">;
}

export function swrTarget(key: string, options: Omit<TargetRef<"swr">, "adapter" | "key" | "action"> = {}): TargetRef<"swr"> {
  return target("swr", key, (options.meta?.action as TargetAction) ?? "revalidate", options) as TargetRef<"swr">;
}

export function zustandTarget(path: string, options: Omit<TargetRef<"zustand">, "adapter" | "key" | "action"> = {}): TargetRef<"zustand"> {
  return target("zustand", path, (options.meta?.action as TargetAction) ?? "patch", options) as TargetRef<"zustand">;
}

export function nextTagTarget(tag: string, options: Omit<TargetRef<"next">, "adapter" | "key" | "action"> = {}): TargetRef<"next"> {
  return target("next", tag, "revalidate", { ...options, meta: { ...options.meta, kind: "tag" } }) as TargetRef<"next">;
}

export function nextPathTarget(path: string, options: Omit<TargetRef<"next">, "adapter" | "key" | "action"> = {}): TargetRef<"next"> {
  return target("next", path, "revalidate", { ...options, meta: { ...options.meta, kind: "path" } }) as TargetRef<"next">;
}

export function apolloTarget(
  options: Omit<TargetRef<"apollo">, "adapter" | "key" | "action"> & { id?: string; typeName?: string; queryName?: string }
): TargetRef<"apollo"> {
  const key = options.id ?? options.queryName ?? options.typeName ?? "apollo";
  return target("apollo", key, (options.meta?.action as TargetAction) ?? "invalidate", {
    ...options,
    meta: { ...options.meta, id: options.id, typeName: options.typeName, queryName: options.queryName }
  }) as TargetRef<"apollo">;
}

export function socketTarget(
  room: string,
  options: Omit<TargetRef<"socket">, "adapter" | "key" | "action"> & { event?: string } = {}
): TargetRef<"socket"> {
  return target("socket", room, "notify", { ...options, meta: { ...options.meta, event: options.event ?? "stalezero.changed" } }) as TargetRef<"socket">;
}

export function searchTarget(
  index: string,
  id: string,
  options: Omit<TargetRef<"search">, "adapter" | "key" | "action"> = {}
): TargetRef<"search"> {
  return target("search", `${index}:${id}`, (options.meta?.action as TargetAction) ?? "enqueue", {
    ...options,
    meta: { ...options.meta, index, id }
  }) as TargetRef<"search">;
}

export function httpTarget(
  url: string,
  options: Omit<TargetRef<"http">, "adapter" | "key" | "action"> = {}
): TargetRef<"http"> {
  return target("http", url, "publish", options) as TargetRef<"http">;
}

export function jobTarget(
  queue: string,
  payload: unknown,
  options: Omit<TargetRef<"job">, "adapter" | "key" | "action"> = {}
): TargetRef<"job"> {
  return target("job", queue, "enqueue", { ...options, meta: { ...options.meta, payload } }) as TargetRef<"job">;
}

export function customTarget(
  adapter: string,
  key: string,
  options: Omit<TargetRef, "adapter" | "key" | "action"> & { action?: TargetAction } = {}
): TargetRef {
  return target(adapter, key, options.action ?? "custom", options);
}
