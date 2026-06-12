import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import { uniqueTargets } from "./utils/collections.js";
import { stableHash } from "./utils/hashing.js";
import type { TargetRef } from "./types.js";

const targetArb = fc.record({
  adapter: fc.stringMatching(/^[a-z][a-z0-9_-]{0,12}$/),
  key: fc.stringMatching(/^[a-zA-Z0-9:_-]{1,24}$/),
  action: fc.constantFrom("invalidate", "delete", "revalidate", "custom")
}) as fc.Arbitrary<TargetRef>;

describe("dedupe determinism", () => {
  it("uniqueTargets is idempotent", () => {
    fc.assert(
      fc.property(fc.array(targetArb, { minLength: 0, maxLength: 40 }), (targets) => {
        const once = uniqueTargets(targets);
        const twice = uniqueTargets(once);
        expect(twice).toEqual(once);
      })
    );
  });

  it("uniqueTargets keeps first occurrence per adapter:action:key", () => {
    fc.assert(
      fc.property(fc.array(targetArb, { minLength: 1, maxLength: 30 }), (targets) => {
        const deduped = uniqueTargets(targets);
        const seen = new Set<string>();
        for (const target of deduped) {
          const signature = `${target.adapter}:${target.action}:${target.key}`;
          expect(seen.has(signature)).toBe(false);
          seen.add(signature);
        }
        expect(deduped.length).toBe(seen.size);
      })
    );
  });

  it("stableHash is deterministic for equivalent values", () => {
    fc.assert(
      fc.property(fc.jsonValue(), (value) => {
        expect(stableHash(value)).toBe(stableHash(value));
      })
    );
  });

  it("stableHash differs for most distinct primitive values", () => {
    fc.assert(
      fc.property(fc.oneof(fc.string(), fc.integer(), fc.boolean()), fc.oneof(fc.string(), fc.integer(), fc.boolean()), (left, right) => {
        fc.pre(JSON.stringify(left) !== JSON.stringify(right));
        expect(stableHash(left)).not.toBe(stableHash(right));
      })
    );
  });
});
