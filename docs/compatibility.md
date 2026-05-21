# Compatibility Matrix

| Runtime/tool | Status |
| --- | --- |
| Node 20 | Supported |
| Node 22 | Supported |
| Node 24 | Development smoke-tested |
| npm 10+ | Supported |
| pnpm | Not claimed until CI coverage is added |
| Yarn | Not claimed until CI coverage is added |
| ESM | Supported |
| CJS `require()` | Not supported |
| CJS dynamic `import()` | Supported |
| Browser core | Supported when no server-only adapters are registered |
| Bun | Experimental |
| Deno | Experimental |
| Next.js server runtime | Supported |
| Next.js client runtime | Core only; Next cache adapter is server-only |
| Next.js edge runtime | Experimental |
| Cloudflare Workers | Experimental with `@stalezero/cloudflare-kv` |
| React Query v4/v5 | Beta |
| SWR v2 | Beta |
| Redux Toolkit | Beta |
| Redis node clients | Beta through compatible client methods |
| Socket.IO v4 | Beta |

CI runs on Linux, macOS, and Windows for Node 20 and Node 22.
