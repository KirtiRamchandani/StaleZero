import { readdir, rm } from "node:fs/promises";
import { join } from "node:path";

const paths = ["dist", "coverage", ".stalezero"];
for (const path of paths) {
  await rm(path, { recursive: true, force: true });
}

for (const group of ["packages", "examples"]) {
  try {
    const entries = await readdir(group, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        await rm(join(group, entry.name, "dist"), { recursive: true, force: true });
        if (group === "packages") {
          for (const nested of ["adapters", "bus"]) {
            try {
              const nestedEntries = await readdir(join(group, nested), { withFileTypes: true });
              for (const nestedEntry of nestedEntries) {
                if (nestedEntry.isDirectory()) {
                  await rm(join(group, nested, nestedEntry.name, "dist"), { recursive: true, force: true });
                }
              }
            } catch {
              // no nested package group
            }
          }
        }
      }
    }
  } catch {
    // no workspace group
  }
}
