import type { EntityRef, TargetRef } from "../types.js";

export function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

export function isTargetRef(value: unknown): value is TargetRef {
  return Boolean(value && typeof value === "object" && "adapter" in value && "key" in value && "action" in value);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function uniqueEntities(entities: EntityRef[]): EntityRef[] {
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

export function uniqueTargets(targets: TargetRef[]): TargetRef[] {
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

export function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

export function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const groupKey = key(item);
    groups.set(groupKey, [...(groups.get(groupKey) ?? []), item]);
  }
  return groups;
}
