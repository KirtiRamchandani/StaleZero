import { describe, expect, it } from "vitest";
import { detectSensitiveValue, redactValue } from "./utils/redaction.js";

describe("redaction value detectors", () => {
  it("detects emails, JWTs, and API keys in values", () => {
    expect(detectSensitiveValue("user@example.com")).toBe("[redacted:email]");
    expect(detectSensitiveValue("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIn0.sig")).toBe("[redacted:jwt]");
    expect(detectSensitiveValue("sk_live_abcdefghijklmnopqrstuv")).toBe("[redacted:api-key]");
  });

  it("redacts nested sensitive values and key names", () => {
    const output = redactValue(
      {
        token: "visible-by-key",
        profile: { email: "user@example.com", name: "Ada" }
      },
      new Set(["token"]),
      undefined,
      { detectValues: true }
    ) as Record<string, unknown>;
    expect(output.token).toBe("[redacted]");
    expect((output.profile as Record<string, unknown>).email).toBe("[redacted:email]");
    expect((output.profile as Record<string, unknown>).name).toBe("Ada");
  });
});
