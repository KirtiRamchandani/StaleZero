import { mkdirSync, writeFileSync } from "node:fs";
import { createStaleZero } from "../packages/stalezero/dist/index.js";

mkdirSync(".stalezero/ci", { recursive: true });
const stale = createStaleZero({ app: "ci", environment: "production" });
writeFileSync(".stalezero/ci/manifest-after.json", `${JSON.stringify(stale.generateManifest(), null, 2)}\n`, "utf8");
