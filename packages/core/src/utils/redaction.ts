export type RedactionMarker = "[redacted]" | "[redacted:email]" | "[redacted:jwt]" | "[redacted:token]" | "[redacted:api-key]" | "[redacted:card]" | "[redacted:phone]";

export type RedactionDetectorOptions = {
  detectValues?: boolean;
  paths?: string[];
  patterns?: RegExp[];
  irreversible?: boolean;
};

const VALUE_DETECTORS: Array<{ pattern: RegExp; marker: RedactionMarker }> = [
  { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, marker: "[redacted:email]" },
  { pattern: /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/, marker: "[redacted:jwt]" },
  { pattern: /^(sk_|pk_|api[_-]?key)[A-Za-z0-9_-]{8,}$/i, marker: "[redacted:api-key]" },
  { pattern: /^(?:\d{4}[- ]?){3}\d{4}$/, marker: "[redacted:card]" },
  { pattern: /^\+?[1-9]\d{7,14}$/, marker: "[redacted:phone]" },
  { pattern: /^[A-Za-z0-9_-]{24,}$/, marker: "[redacted:token]" }
];

export function detectSensitiveValue(value: unknown): RedactionMarker | undefined {
  if (typeof value !== "string" || value.length < 4) {
    return undefined;
  }
  for (const detector of VALUE_DETECTORS) {
    if (detector.pattern.test(value)) {
      return detector.marker;
    }
  }
  return undefined;
}

export function redactValue(
  value: unknown,
  keys: Set<string>,
  custom: ((key: string, value: unknown, path: string[]) => unknown) | undefined,
  options: RedactionDetectorOptions = {},
  path: string[] = []
): unknown {
  if (typeof value === "string") {
    if (options.detectValues !== false) {
      const detected = detectSensitiveValue(value);
      if (detected) {
        return detected;
      }
    }
    if (options.patterns?.some((pattern) => pattern.test(value))) {
      return "[redacted]";
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item, index) => redactValue(item, keys, custom, options, [...path, String(index)]));
  }
  if (!value || typeof value !== "object") {
    return value;
  }
  const output: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value)) {
    const nestedPath = [...path, key];
    if (keys.has(key) || options.paths?.some((item) => nestedPath.join(".").endsWith(item))) {
      output[key] = "[redacted]";
      continue;
    }
    output[key] = custom
      ? custom(key, redactValue(nested, keys, custom, options, nestedPath), nestedPath)
      : redactValue(nested, keys, custom, options, nestedPath);
  }
  return output;
}
