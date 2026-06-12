import type { MutationDefinition, TargetRef } from "../types.js";
import { isRecord, isTargetRef, uniqueStrings } from "./collections.js";

export function targetSignature(targetRef: TargetRef): string {
  return `${targetRef.adapter}:${targetRef.action}:${targetRef.key}`;
}

export function inferChangedFields(input: unknown): string[] {
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

export function filterTargetsByRoutes(targets: TargetRef[], definition: MutationDefinition | undefined, changedFields: string[]): TargetRef[] {
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

export function inferAdapterFromMirrorName(name: string): string {
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

export function patternMatches(pattern: string, value: string): boolean {
  if (pattern === value) {
    return true;
  }
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replaceAll("*", ".*");
  return new RegExp(`^${escaped}$`).test(value);
}

export function isSafeReplayTarget(targetRef: TargetRef): boolean {
  if (targetRef.idempotent === true || targetRef.meta?.idempotent === true) {
    return true;
  }
  return ["delete", "invalidate", "refetch", "revalidate", "remove"].includes(targetRef.action);
}
