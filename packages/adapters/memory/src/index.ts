import type { Adapter, MutationContext, TargetRef } from "@stalezero/core";

export type MemoryCall = {
  target: TargetRef;
  context: MutationContext;
};

export type MemoryAdapter = Adapter & {
  calls: MemoryCall[];
  clear: () => void;
};

export function memoryAdapter(name = "memory"): MemoryAdapter {
  const calls: MemoryCall[] = [];
  return {
    name,
    calls,
    execute: (target, context) => {
      calls.push({ target, context });
    },
    clear: () => {
      calls.length = 0;
    }
  };
}

export function memoryTarget(key: string, options: Omit<TargetRef<"memory">, "adapter" | "key" | "action"> = {}): TargetRef<"memory"> {
  return { adapter: "memory", key, action: "custom", ...options };
}
