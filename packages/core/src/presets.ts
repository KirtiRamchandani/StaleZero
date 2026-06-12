import type { SecurityConfig, StaleZeroConfig, StaleZeroMode } from "./types.js";

export function resolveStaleZeroMode(config: StaleZeroConfig = {}): StaleZeroMode {
  if (config.mode) {
    return config.mode;
  }
  if (config.environment === "production") {
    return "production";
  }
  if (config.environment === "test") {
    return "test";
  }
  return "development";
}

export function productionSecurityDefaults(): SecurityConfig {
  return {
    mode: "strict",
    requireActor: false,
    requireSchema: false,
    requireTenantBoundary: false,
    blockUnsafeTargets: true
  };
}

export function applyModeDefaults(config: StaleZeroConfig = {}): StaleZeroConfig {
  const mode = resolveStaleZeroMode(config);

  if (mode === "production") {
    return {
      ...config,
      mode,
      environment: config.environment ?? "production",
      allowUndeclaredMutations: config.allowUndeclaredMutations ?? false,
      execution: {
        warnOnMemoryReceiptStoreInProduction: true,
        ...config.execution
      },
      security: {
        ...productionSecurityDefaults(),
        ...config.security
      },
      devtools: {
        enabledInProduction: false,
        requireAuthInProduction: true,
        ...config.devtools
      }
    };
  }

  if (mode === "test") {
    return {
      ...config,
      mode,
      environment: config.environment ?? "test",
      allowUndeclaredMutations: config.allowUndeclaredMutations ?? true,
      execution: {
        warnOnMemoryReceiptStoreInProduction: false,
        ...config.execution
      }
    };
  }

  return {
    ...config,
    mode,
    environment: config.environment ?? "development",
    allowUndeclaredMutations: config.allowUndeclaredMutations ?? "warn"
  };
}

export function productionPreset(config: Omit<StaleZeroConfig, "mode"> = {}): StaleZeroConfig {
  return applyModeDefaults({ ...config, mode: "production" });
}

export function developmentPreset(config: Omit<StaleZeroConfig, "mode"> = {}): StaleZeroConfig {
  return applyModeDefaults({ ...config, mode: "development" });
}

export function testPreset(config: Omit<StaleZeroConfig, "mode"> = {}): StaleZeroConfig {
  return applyModeDefaults({ ...config, mode: "test" });
}
