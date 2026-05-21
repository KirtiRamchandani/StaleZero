import { describe, expect, it } from "vitest";
import { createStaleZero } from "@stalezero/core";
import { createDevtoolsWebHandler, devtoolsSnapshot, renderStaticDevtoolsHtml } from "./index.js";

describe("devtools safety controls", () => {
  it("is disabled in production unless explicitly enabled", async () => {
    const handler = createDevtoolsWebHandler(createStaleZero(), { isProduction: true });
    const response = await handler(new Request("https://example.test/devtools"));

    expect(response.status).toBe(403);
  });

  it("supports auth hooks and cors headers", async () => {
    const handler = createDevtoolsWebHandler(createStaleZero(), {
      auth: (request) => request.headers.get("authorization") === "Bearer ok",
      cors: { origin: "https://app.test" }
    });

    const unauthorized = await handler(new Request("https://example.test/devtools", { headers: { origin: "https://app.test" } }));
    const authorized = await handler(new Request("https://example.test/devtools/timeline.json", { headers: { authorization: "Bearer ok", origin: "https://app.test" } }));

    expect(unauthorized.status).toBe(401);
    expect(authorized.headers.get("access-control-allow-origin")).toBe("https://app.test");
  });

  it("exports redaction-safe snapshots and static HTML", async () => {
    const stale = createStaleZero({ receipts: { redact: ["token"] } });
    await stale.changed("SecretChanged", { token: "hidden" });
    const snapshot = await devtoolsSnapshot(stale, { redact: ["token"] });

    expect(JSON.stringify(snapshot)).not.toContain("hidden");
    expect(renderStaticDevtoolsHtml(snapshot)).toContain("Receipt Timeline");
  });

  it("returns a clear response for oversized payloads", async () => {
    const handler = createDevtoolsWebHandler(createStaleZero(), { payloadLimitBytes: 4 });
    const response = await handler(new Request("https://example.test/devtools/preview", { method: "POST", body: JSON.stringify({ mutation: "A" }) }));

    expect(response.status).toBe(413);
  });
});
