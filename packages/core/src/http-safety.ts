import { StaleZeroSecurityError } from "./errors.js";
import type { TargetRef } from "./types.js";

export type HttpSafetyOptions = {
  requireHttps?: boolean;
  blockLocalhost?: boolean;
  blockPrivateIps?: boolean;
  allowHosts?: string[];
  denyHosts?: string[];
  allowedMethods?: string[];
  maxBodyBytes?: number;
  maxResponseBytes?: number;
};

const BLOCKED_LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);

export function httpSafetyOptionsFromTarget(targetRef: TargetRef): HttpSafetyOptions {
  const meta = isRecord(targetRef.meta) ? targetRef.meta : {};
  return {
    requireHttps: meta.requireHttps !== false,
    blockLocalhost: meta.blockLocalhost !== false,
    blockPrivateIps: meta.blockPrivateIps !== false,
    allowHosts: Array.isArray(meta.allowHosts) ? meta.allowHosts.map(String) : undefined,
    denyHosts: Array.isArray(meta.denyHosts) ? meta.denyHosts.map(String) : undefined,
    allowedMethods: Array.isArray(meta.allowedMethods) ? meta.allowedMethods.map(String) : undefined,
    maxBodyBytes: typeof meta.maxBodyBytes === "number" ? meta.maxBodyBytes : undefined,
    maxResponseBytes: typeof meta.maxResponseBytes === "number" ? meta.maxResponseBytes : undefined
  };
}

export function assertSafeHttpUrl(urlString: string, options: HttpSafetyOptions = {}): URL {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    throw new StaleZeroSecurityError(`Blocked HTTP target ${urlString}: invalid URL`, { url: urlString });
  }

  const requireHttps = options.requireHttps !== false;
  if (requireHttps && url.protocol !== "https:") {
    throw new StaleZeroSecurityError(`Blocked HTTP target ${urlString}: HTTPS is required`, { url: urlString });
  }

  if (options.denyHosts?.includes(url.hostname)) {
    throw new StaleZeroSecurityError(`Blocked HTTP target ${urlString}: host is denied`, { host: url.hostname });
  }

  const allowHosts = options.allowHosts;
  if (allowHosts?.length && !allowHosts.includes(url.hostname)) {
    throw new StaleZeroSecurityError(`Blocked HTTP target ${urlString}: host is not allowed`, { host: url.hostname });
  }

  const blockLocalhost = options.blockLocalhost !== false;
  if (blockLocalhost && BLOCKED_LOCAL_HOSTS.has(url.hostname)) {
    throw new StaleZeroSecurityError(`Blocked HTTP target ${urlString}: localhost is not allowed`, { host: url.hostname });
  }

  const blockPrivateIps = options.blockPrivateIps !== false;
  if (blockPrivateIps && isPrivateHost(url.hostname)) {
    throw new StaleZeroSecurityError(`Blocked HTTP target ${urlString}: private network target is not allowed`, {
      host: url.hostname
    });
  }

  return url;
}

export function assertSafeHttpTarget(targetRef: TargetRef): URL {
  return assertSafeHttpUrl(targetRef.key, httpSafetyOptionsFromTarget(targetRef));
}

export function assertSafeHttpMethod(method: string, options: HttpSafetyOptions = {}): void {
  const allowed = options.allowedMethods;
  if (!allowed?.length) {
    return;
  }
  const normalized = method.toUpperCase();
  if (!allowed.map((item) => item.toUpperCase()).includes(normalized)) {
    throw new StaleZeroSecurityError(`Blocked HTTP method ${normalized}: method is not allowed`, { method: normalized });
  }
}

export function isPrivateHost(hostname: string): boolean {
  if (hostname === "169.254.169.254") {
    return true;
  }
  const parts = hostname.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return false;
  }
  const [first, second] = parts as [number, number, number, number];
  return first === 10 || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168) || first === 127;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
