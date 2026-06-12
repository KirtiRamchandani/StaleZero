import { StaleZeroTimeoutError } from "./errors.js";
import type { MaybePromise } from "./types.js";

export async function withTimeout<T>(
  task: (signal: AbortSignal) => MaybePromise<T>,
  timeoutMs: number,
  label: string,
  externalSignal?: AbortSignal
): Promise<T> {
  if (timeoutMs <= 0) {
    return task(externalSignal ?? new AbortController().signal);
  }

  const controller = new AbortController();
  const abort = (reason?: unknown) => {
    if (!controller.signal.aborted) {
      controller.abort(reason);
    }
  };

  const onExternalAbort = () => abort(externalSignal?.reason);
  externalSignal?.addEventListener("abort", onExternalAbort, { once: true });

  const timeoutId = setTimeout(() => abort(new StaleZeroTimeoutError(label, timeoutMs)), timeoutMs);

  try {
    return await new Promise<T>((resolve, reject) => {
      const onAbort = () => {
        const reason = controller.signal.reason;
        reject(reason instanceof StaleZeroTimeoutError ? reason : new StaleZeroTimeoutError(label, timeoutMs));
      };
      controller.signal.addEventListener("abort", onAbort, { once: true });

      Promise.resolve()
        .then(() => task(controller.signal))
        .then(resolve)
        .catch((error) => {
          if (controller.signal.aborted) {
            onAbort();
            return;
          }
          reject(error);
        });
    });
  } finally {
    clearTimeout(timeoutId);
    externalSignal?.removeEventListener("abort", onExternalAbort);
  }
}
