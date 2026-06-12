import type { ExecutionResult } from "../types.js";

export function serializeError(error: unknown): { name: string; message: string; stack?: string } {
  if (error instanceof Error) {
    const name = error.name === "StaleZeroTimeoutError" ? "TimeoutError" : error.name;
    return { name, message: error.message, stack: error.stack };
  }
  return { name: "Error", message: String(error) };
}

export function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return JSON.stringify(error);
}

export function receiptStatus(results: ExecutionResult[]): "success" | "partial" | "failed" {
  const failures = results.filter((result) => result.status === "failed");
  if (failures.length === 0) {
    return "success";
  }
  if (failures.length === results.length) {
    return "failed";
  }
  return "partial";
}
