import type { MaybePromise } from "../types.js";

export async function mapLimit<T, TResult>(
  items: T[],
  limit: number,
  task: (item: T, index: number) => MaybePromise<TResult>
): Promise<TResult[]> {
  const results = new Array<TResult>(items.length);
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await task(items[index] as T, index);
    }
  }

  const workerCount = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

export async function asyncFlatMap<T, TResult>(items: T[], task: (item: T) => MaybePromise<TResult[]>): Promise<TResult[]> {
  const nested = await Promise.all(items.map(task));
  return nested.flat();
}

export function sleep(ms: number): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => setTimeout(resolve, ms));
}
