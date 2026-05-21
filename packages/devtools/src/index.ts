import type { MaybePromise, Receipt, StaleZero } from "@stalezero/core";

export type DevtoolsOptions = {
  auth?: (request: Request) => MaybePromise<boolean>;
  cors?:
    | boolean
    | {
        origin?: string | string[];
        methods?: string[];
        headers?: string[];
      };
  enabledInProduction?: boolean;
  isProduction?: boolean;
  payloadLimitBytes?: number;
  receiptsLimit?: number;
  slowLimit?: number;
  redact?: string[];
};

export type DevtoolsSnapshot = {
  status: Awaited<ReturnType<StaleZero["status"]>>;
  receipts: ReturnType<Receipt["toJSON"]>[];
  manifest: ReturnType<StaleZero["generateManifest"]>;
  timeline: Array<{ id: string; mutation: string; status: string; durationMs: number; timestamp: number }>;
  failures: ReturnType<Receipt["toJSON"]>["results"];
  slow: ReturnType<Receipt["toJSON"]>["results"];
  events: Array<{ receipt: string; mutation: string; bus: string; status: string; timestamp: number }>;
  outbox: Array<{ receipt: string; mutation: string; status: string; timestamp: number }>;
};

export async function devtoolsSnapshot(stale: StaleZero, options: DevtoolsOptions = {}): Promise<DevtoolsSnapshot> {
  const redactionKeys = new Set(options.redact ?? []);
  const receipts = (await stale.receipts.list({ limit: options.receiptsLimit ?? 100 })).map((receipt) =>
    redactReceipt(receipt.toJSON(), redactionKeys)
  );
  const results = receipts.flatMap((receipt) => receipt.results);
  return {
    status: await stale.status(),
    receipts,
    manifest: stale.generateManifest(),
    timeline: receipts.map((receipt) => ({
      id: receipt.id,
      mutation: receipt.mutation,
      status: receipt.status,
      durationMs: receipt.durationMs,
      timestamp: receipt.timestamp
    })),
    failures: results.filter((result) => result.status === "failed"),
    slow: [...results].sort((left, right) => right.durationMs - left.durationMs).slice(0, options.slowLimit ?? 20),
    events: receipts.flatMap((receipt) =>
      receipt.results
        .filter((result) => result.adapter === "bus")
        .map((result) => ({
          receipt: receipt.id,
          mutation: receipt.mutation,
          bus: result.key,
          status: result.status,
          timestamp: receipt.timestamp
        }))
    ),
    outbox: receipts
      .filter((receipt) => receipt.targets.some((target) => target.adapter === "outbox" || target.key.includes("outbox")))
      .map((receipt) => ({ receipt: receipt.id, mutation: receipt.mutation, status: receipt.status, timestamp: receipt.timestamp }))
  };
}

export function createDevtoolsHandler(stale: StaleZero): (request: unknown, response?: unknown) => Promise<unknown> {
  return stale.devtoolsHandler();
}

export function createDevtoolsWebHandler(stale: StaleZero, options: DevtoolsOptions = {}) {
  return async (request: Request): Promise<Response> => {
    const headers = corsHeaders(request, options);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }
    if (isProduction(options) && !options.enabledInProduction) {
      return text("Devtools are disabled in production by default.", 403, headers);
    }
    if (options.auth && !(await options.auth(request))) {
      return text("Unauthorized", 401, headers);
    }
    const url = new URL(request.url);
    const snapshot = filterSnapshot(await devtoolsSnapshot(stale, options), url.searchParams);

    if (url.pathname.endsWith("/timeline.json")) {
      return json(snapshot.timeline, 200, headers);
    }
    if (url.pathname.endsWith("/failures.json")) {
      return json(snapshot.failures, 200, headers);
    }
    if (url.pathname.endsWith("/slow.json")) {
      return json(snapshot.slow, 200, headers);
    }
    if (url.pathname.endsWith("/events.json")) {
      return json(snapshot.events, 200, headers);
    }
    if (url.pathname.endsWith("/outbox.json")) {
      return json(snapshot.outbox, 200, headers);
    }
    if (url.pathname.endsWith("/receipt.json")) {
      return json(snapshot.receipts, 200, headers);
    }
    if (url.pathname.endsWith("/graph.json")) {
      return json(snapshot.manifest, 200, headers);
    }
    if (url.pathname.endsWith("/graph.svg")) {
      return new Response(renderGraphSvg(snapshot), { headers: withContentType(headers, "image/svg+xml") });
    }
    if (url.pathname.endsWith("/snippet")) {
      return new Response(copyReproductionSnippet(snapshot), { headers: withContentType(headers, "text/plain; charset=utf-8") });
    }
    if (url.pathname.endsWith("/static.html") || url.pathname.endsWith("/share")) {
      return new Response(renderStaticDevtoolsHtml(snapshot), { headers: withContentType(headers, "text/html; charset=utf-8") });
    }
    if (url.pathname.endsWith("/preview")) {
      const bodyResult = request.method === "POST" ? await safeReadJson(request, options) : { ok: true as const, value: {} };
      if (!bodyResult.ok) {
        return json({ error: bodyResult.error }, 413, headers);
      }
      const body = bodyResult.value as { mutation?: string; input?: unknown };
      const mutation = body.mutation ?? url.searchParams.get("mutation");
      if (!mutation) {
        return json({ error: "Missing mutation" }, 400, headers);
      }
      const input = body.input ?? parseJson(url.searchParams.get("input")) ?? {};
      return json((await stale.preview(mutation, input)).toJSON(), 200, headers);
    }
    if (url.pathname.endsWith("/why")) {
      const target = url.searchParams.get("target");
      if (!target) {
        return json({ error: "Missing target" }, 400, headers);
      }
      const input = parseJson(url.searchParams.get("input")) ?? {};
      const result = await stale.why(target, input);
      return json({
        target: result.target,
        dependsOn: result.dependsOn,
        mutations: result.mutations,
        lastReceipt: result.lastReceipt?.toJSON(),
        text: result.toText()
      }, 200, headers);
    }
    if (url.pathname.includes("/mutation/")) {
      const mutation = decodeURIComponent(url.pathname.split("/mutation/")[1] ?? "");
      return json({
        mutation,
        manifest: snapshot.manifest.mutations[mutation],
        receipts: snapshot.receipts.filter((receipt) => receipt.mutation === mutation)
      }, 200, headers);
    }
    if (url.pathname.includes("/target/")) {
      const target = decodeURIComponent(url.pathname.split("/target/")[1] ?? "");
      return json({
        target,
        manifest: snapshot.manifest.mirrors[target],
        receipts: snapshot.receipts.filter((receipt) => receipt.targets.some((targetRef) => targetRef.label === target || targetRef.key === target))
      }, 200, headers);
    }
    if (url.pathname.endsWith("/redaction-preview")) {
      const bodyResult = request.method === "POST" ? await safeReadJson(request, options) : { ok: true as const, value: {} };
      if (!bodyResult.ok) {
        return json({ error: bodyResult.error }, 413, headers);
      }
      const body = bodyResult.value as { value?: unknown; redact?: string[] };
      return json(redact(body.value ?? {}, new Set(body.redact ?? [])), 200, headers);
    }

    return new Response(renderDevtoolsHtml(snapshot, isProduction(options) && Boolean(options.enabledInProduction)), {
      headers: withContentType(headers, "text/html; charset=utf-8")
    });
  };
}

export function createExpressDevtoolsHandler(stale: StaleZero, options: DevtoolsOptions = {}) {
  return async (request: { originalUrl?: string; url?: string; protocol?: string; get?: (name: string) => string }, response: { status: (code: number) => unknown; setHeader: (name: string, value: string) => void; end: (body: string) => void }) => {
    const host = request.get?.("host") ?? "localhost";
    const webRequest = new Request(`${request.protocol ?? "http"}://${host}${request.originalUrl ?? request.url ?? "/"}`);
    const webResponse = await createDevtoolsWebHandler(stale, options)(webRequest);
    response.status(webResponse.status);
    webResponse.headers.forEach((value, key) => response.setHeader(key, value));
    response.end(await webResponse.text());
  };
}

export function createFastifyDevtoolsHandler(stale: StaleZero, options: DevtoolsOptions = {}) {
  return async (request: { url: string; headers: { host?: string } }, reply: { code: (code: number) => unknown; header: (name: string, value: string) => unknown; send: (body: string) => unknown }) => {
    const webResponse = await createDevtoolsWebHandler(stale, options)(new Request(`http://${request.headers.host ?? "localhost"}${request.url}`));
    reply.code(webResponse.status);
    webResponse.headers.forEach((value, key) => reply.header(key, value));
    reply.send(await webResponse.text());
  };
}

export const createNextDevtoolsHandler = createDevtoolsWebHandler;

export function StaleZeroPanel(props: { receipts?: Receipt[]; title?: string }): string {
  const receipts = props.receipts ?? [];
  const title = props.title ?? "StaleZero";
  return [
    `<section data-stalezero-panel>`,
    `<h2>${escapeHtml(title)}</h2>`,
    `<ol>`,
    ...receipts.map((receipt) => `<li><strong>${escapeHtml(receipt.mutation)}</strong> ${escapeHtml(receipt.status)}</li>`),
    `</ol>`,
    `</section>`
  ].join("");
}

export function createReactDevtoolsPanel(react: {
  createElement: (type: string, props: Record<string, unknown> | null, ...children: unknown[]) => unknown;
}) {
  return function StaleZeroReactPanel(props: { receipts?: Receipt[]; title?: string }) {
    const receipts = props.receipts ?? [];
    return react.createElement(
      "section",
      { "data-stalezero-panel": true },
      react.createElement("h2", null, props.title ?? "StaleZero"),
      react.createElement(
        "ol",
        null,
        ...receipts.map((receipt) =>
          react.createElement("li", { key: receipt.id }, `${receipt.mutation} ${receipt.status}`)
        )
      )
    );
  };
}

function json(value: unknown, status = 200, headers = new Headers()): Response {
  return new Response(JSON.stringify(value, null, 2), { status, headers: withContentType(headers, "application/json; charset=utf-8") });
}

export function renderStaticDevtoolsHtml(snapshot: DevtoolsSnapshot): string {
  return renderDevtoolsHtml(snapshot, false);
}

function renderDevtoolsHtml(snapshot: DevtoolsSnapshot, productionWarning: boolean): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>StaleZero Devtools</title>
  <style>
    body { margin: 0; font: 14px system-ui, sans-serif; color: #172026; background: #f6f7f8; }
    header { padding: 20px 28px; background: #172026; color: white; }
    main { display: grid; grid-template-columns: 280px 1fr; gap: 20px; padding: 20px; }
    section { background: white; border: 1px solid #d9dee3; border-radius: 8px; padding: 16px; }
    form.filters { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 16px; }
    input, select, button { font: inherit; padding: 8px; border: 1px solid #cfd6dd; border-radius: 6px; background: white; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border-bottom: 1px solid #e8ecef; padding: 8px; text-align: left; }
    .graph-canvas { overflow: hidden; border: 1px solid #d9dee3; border-radius: 8px; background: white; max-height: 320px; cursor: grab; }
    .graph-canvas svg { width: 100%; height: auto; transform-origin: 0 0; transition: transform 120ms ease; }
    .actions { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0; }
    .warning { background: #fff7ed; border: 1px solid #fed7aa; color: #9a3412; padding: 10px 12px; border-radius: 6px; margin-bottom: 16px; }
    .failed { color: #b42318; }
    .success { color: #067647; }
    code { background: #eef1f3; padding: 2px 4px; border-radius: 4px; }
    @media (prefers-color-scheme: dark) {
      body { color: #e6edf3; background: #0d1117; }
      header { background: #010409; }
      section { background: #161b22; border-color: #30363d; }
      input, select, button { color: #e6edf3; background: #0d1117; border-color: #30363d; }
      code { background: #30363d; }
    }
  </style>
</head>
<body>
  <header><h1>StaleZero Devtools</h1></header>
  <main>
    <section>
      <h2>Graph</h2>
      <p>${snapshot.status.mutations.length} mutations</p>
      <p>${snapshot.status.mirrors.length} targets</p>
      <p>${snapshot.status.adapters.length} adapters</p>
      <p><a href="./graph.json">Export graph JSON</a></p>
      <p><a href="./receipt.json">Export receipt JSON</a></p>
      <p><a href="./events.json">Distributed events</a></p>
      <p><a href="./outbox.json">Outbox queue</a></p>
      <p><a href="./static.html">Static share view</a></p>
      <h2>Preview Playground</h2>
      <form method="get" action="./preview">
        <p><input name="mutation" placeholder="Mutation name" /></p>
        <p><input name="input" placeholder='{"id":"123"}' /></p>
        <button>Preview</button>
      </form>
      <h2>Why Mode</h2>
      <form method="get" action="./why">
        <p><input name="target" placeholder="Target name" /></p>
        <p><input name="input" placeholder='{"id":"123"}' /></p>
        <button>Explain</button>
      </form>
    </section>
    <section>
      ${productionWarning ? `<div class="warning">Devtools are enabled in production. Use an auth hook, tight CORS, and redaction.</div>` : ""}
      <form class="filters" method="get">
        <input name="q" placeholder="Search receipts" />
        <input name="mutation" placeholder="Mutation" />
        <select name="status"><option value="">Any status</option><option>success</option><option>partial</option><option>failed</option><option>dry-run</option></select>
        <button>Filter</button>
      </form>
      <h2>Blast-radius Graph</h2>
      <div class="actions">
        <button type="button" data-zoom="in">Zoom in</button>
        <button type="button" data-zoom="out">Zoom out</button>
        <button type="button" data-copy="receipt">Copy receipt JSON</button>
        <button type="button" data-copy="snippet">Copy reproduction snippet</button>
      </div>
      <div class="graph-canvas" data-graph>${renderGraphSvg(snapshot)}</div>
      <h2>Receipt Timeline</h2>
      <table>
        <thead><tr><th>Mutation</th><th>Status</th><th>Duration</th><th>Time</th></tr></thead>
        <tbody>
          ${snapshot.timeline.map((item) => `<tr data-mutation="${escapeHtml(item.mutation)}"><td><a href="./mutation/${encodeURIComponent(item.mutation)}"><code>${escapeHtml(item.mutation)}</code></a></td><td class="${escapeHtml(item.status)}">${escapeHtml(item.status)}</td><td>${item.durationMs}ms</td><td>${new Date(item.timestamp).toISOString()}</td></tr>`).join("")}
        </tbody>
      </table>
      <h2>Adapter Results</h2>
      <table>
        <thead><tr><th>Adapter</th><th>Key</th><th>Status</th><th>Duration</th></tr></thead>
        <tbody>
          ${snapshot.receipts.flatMap((receipt) => receipt.results).map((result) => `<tr><td>${escapeHtml(result.adapter)}</td><td><a href="./target/${encodeURIComponent(result.key)}"><code>${escapeHtml(result.key)}</code></a></td><td class="${escapeHtml(result.status)}">${escapeHtml(result.status)}</td><td>${result.durationMs}ms</td></tr>`).join("")}
        </tbody>
      </table>
      <h2>Failed Invalidations</h2>
      <table>
        <thead><tr><th>Adapter</th><th>Key</th><th>Error</th></tr></thead>
        <tbody>
          ${snapshot.failures.map((result) => `<tr><td>${escapeHtml(result.adapter)}</td><td><code>${escapeHtml(result.key)}</code></td><td>${escapeHtml(result.error?.message ?? "")}</td></tr>`).join("")}
        </tbody>
      </table>
      <h2>Slow Adapter Timing</h2>
      <table>
        <thead><tr><th>Adapter</th><th>Key</th><th>Duration</th></tr></thead>
        <tbody>
          ${snapshot.slow.map((result) => `<tr><td>${escapeHtml(result.adapter)}</td><td><code>${escapeHtml(result.key)}</code></td><td>${result.durationMs}ms</td></tr>`).join("")}
        </tbody>
      </table>
    </section>
  </main>
  <script>
    const graph = document.querySelector("[data-graph] svg");
    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;
    function paintGraph() {
      if (graph) graph.style.transform = "translate(" + offsetX + "px," + offsetY + "px) scale(" + scale + ")";
    }
    document.querySelector("[data-zoom='in']")?.addEventListener("click", () => { scale = Math.min(3, scale + 0.2); paintGraph(); });
    document.querySelector("[data-zoom='out']")?.addEventListener("click", () => { scale = Math.max(0.5, scale - 0.2); paintGraph(); });
    document.querySelector("[data-copy='receipt']")?.addEventListener("click", async () => {
      await navigator.clipboard?.writeText(${JSON.stringify(JSON.stringify(snapshot.receipts[0] ?? {}, null, 2))});
    });
    document.querySelector("[data-copy='snippet']")?.addEventListener("click", async () => {
      const latest = ${JSON.stringify(snapshot.receipts[0] ? copyReproductionSnippet(snapshot) : "No receipt available.")};
      await navigator.clipboard?.writeText(latest);
    });
    document.querySelectorAll("tr[data-mutation]").forEach((row) => {
      row.addEventListener("click", () => {
        document.querySelectorAll("tr[data-mutation]").forEach((item) => item.removeAttribute("aria-current"));
        row.setAttribute("aria-current", "true");
      });
    });
  </script>
</body>
</html>`;
}

function renderGraphSvg(snapshot: DevtoolsSnapshot): string {
  const mutations = Object.keys(snapshot.manifest.mutations);
  const width = 900;
  const height = Math.max(220, mutations.length * 90 + 80);
  const rows = mutations
    .map((mutation, index) => {
      const y = 60 + index * 90;
      const mirrors = snapshot.manifest.mutations[mutation]?.mirrors ?? [];
      return `<text x="40" y="${y}" font-size="16" font-family="system-ui">${escapeHtml(mutation)}</text>${mirrors
        .map((mirror, mirrorIndex) => {
          const x = 320 + mirrorIndex * 160;
          return `<line x1="180" y1="${y - 5}" x2="${x - 12}" y2="${y - 5}" stroke="#98a2b3"/><rect x="${x}" y="${y - 28}" width="130" height="34" rx="6" fill="#eef8f2" stroke="#9bd4aa"/><text x="${x + 12}" y="${y - 6}" font-size="13" font-family="system-ui">${escapeHtml(mirror)}</text>`;
        })
        .join("")}`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="white"/><text x="40" y="32" font-size="20" font-family="system-ui" font-weight="700">Blast-radius graph</text>${rows}</svg>`;
}

function copyReproductionSnippet(snapshot: DevtoolsSnapshot): string {
  const latest = snapshot.receipts[0];
  if (!latest) {
    return "No receipt available.";
  }
  return `await stale.changed(${JSON.stringify(latest.mutation)}, ${JSON.stringify(latest.input, null, 2)});`;
}

function parseJson(value: string | null): unknown {
  if (!value) {
    return undefined;
  }
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

async function readJson(request: Request, options: DevtoolsOptions): Promise<unknown> {
  const textBody = await request.text();
  const limit = options.payloadLimitBytes ?? 64_000;
  if (new TextEncoder().encode(textBody).length > limit) {
    throw new Error(`Devtools payload is larger than ${limit} bytes`);
  }
  return textBody ? JSON.parse(textBody) : {};
}

async function safeReadJson(
  request: Request,
  options: DevtoolsOptions
): Promise<{ ok: true; value: unknown } | { ok: false; error: string }> {
  try {
    return { ok: true, value: await readJson(request, options) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

function text(body: string, status: number, headers = new Headers()): Response {
  return new Response(body, { status, headers: withContentType(headers, "text/plain; charset=utf-8") });
}

function withContentType(headers: Headers, contentType: string): Headers {
  const next = new Headers(headers);
  next.set("content-type", contentType);
  return next;
}

function corsHeaders(request: Request, options: DevtoolsOptions): Headers {
  const headers = new Headers();
  if (!options.cors) {
    return headers;
  }
  const origin = request.headers.get("origin") ?? "*";
  const config = typeof options.cors === "object" ? options.cors : {};
  const allowed = config.origin === undefined ? "*" : Array.isArray(config.origin) ? config.origin : [config.origin];
  const wildcard = allowed === "*" || allowed.includes("*");
  if (wildcard || allowed.includes(origin)) {
    headers.set("access-control-allow-origin", wildcard ? "*" : origin);
  }
  headers.set("access-control-allow-methods", (config.methods ?? ["GET", "POST", "OPTIONS"]).join(","));
  headers.set("access-control-allow-headers", (config.headers ?? ["content-type", "authorization"]).join(","));
  return headers;
}

function isProduction(options: DevtoolsOptions): boolean {
  return options.isProduction ?? globalThis.process?.env?.NODE_ENV === "production";
}

function filterSnapshot(snapshot: DevtoolsSnapshot, params: URLSearchParams): DevtoolsSnapshot {
  const mutation = params.get("mutation");
  const status = params.get("status");
  const query = params.get("q")?.toLowerCase();
  const minDuration = Number(params.get("slowMs") ?? 0);
  const receipts = snapshot.receipts.filter((receipt) => {
    if (mutation && receipt.mutation !== mutation) {
      return false;
    }
    if (status && receipt.status !== status) {
      return false;
    }
    if (query && !JSON.stringify(receipt).toLowerCase().includes(query)) {
      return false;
    }
    if (minDuration && !receipt.results.some((result) => result.durationMs >= minDuration)) {
      return false;
    }
    return true;
  });
  const results = receipts.flatMap((receipt) => receipt.results);
  return {
    ...snapshot,
    receipts,
    timeline: receipts.map((receipt) => ({
      id: receipt.id,
      mutation: receipt.mutation,
      status: receipt.status,
      durationMs: receipt.durationMs,
      timestamp: receipt.timestamp
    })),
    failures: results.filter((result) => result.status === "failed"),
    slow: results.sort((left, right) => right.durationMs - left.durationMs),
    events: snapshot.events.filter((event) => !mutation || event.mutation === mutation),
    outbox: snapshot.outbox.filter((event) => !mutation || event.mutation === mutation)
  };
}

function redactReceipt<T>(value: T, keys: Set<string>): T {
  if (keys.size === 0) {
    return value;
  }
  return redact(value, keys) as T;
}

function redact(value: unknown, keys: Set<string>): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redact(item, keys));
  }
  if (!value || typeof value !== "object") {
    return value;
  }
  const output: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value)) {
    output[key] = keys.has(key) ? "[redacted]" : redact(nested, keys);
  }
  return output;
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
