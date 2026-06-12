import { developmentPreset, productionPreset, testPreset } from "./presets.js";
import type { StaleZero } from "./engine/api.js";
import type { StaleZeroConfig } from "./types.js";
import { StaleZeroEngine } from "./engine/StaleZeroEngine.js";

export function createStaleZero(config?: StaleZeroConfig): StaleZero<{}> {
  return new StaleZeroEngine(config) as unknown as StaleZero<{}>;
}

createStaleZero.production = (config: Omit<StaleZeroConfig, "mode"> = {}): StaleZero<{}> =>
  new StaleZeroEngine(productionPreset(config)) as unknown as StaleZero<{}>;

createStaleZero.dev = (config: Omit<StaleZeroConfig, "mode"> = {}): StaleZero<{}> =>
  new StaleZeroEngine(developmentPreset(config)) as unknown as StaleZero<{}>;

createStaleZero.test = (config: Omit<StaleZeroConfig, "mode"> = {}): StaleZero<{}> =>
  new StaleZeroEngine(testPreset(config)) as unknown as StaleZero<{}>;
