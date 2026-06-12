import { defineConfig } from "vitepress";

export default defineConfig({
  title: "StaleZero",
  description: "Mutation consequence engine for TypeScript — preview, execute, prove, and receipt every cache and state side effect.",
  base: "/StaleZero/",
  themeConfig: {
    nav: [
      { text: "Guide", link: "/quickstart" },
      { text: "CLI", link: "/cli" },
      { text: "Production", link: "/production-checklist" },
      { text: "GitHub", link: "https://github.com/KirtiRamchandani/StaleZero" }
    ],
    sidebar: [
      {
        text: "Start",
        items: [
          { text: "Quickstart", link: "/quickstart" },
          { text: "Concepts", link: "/concepts" },
          { text: "Receipts", link: "/receipts" }
        ]
      },
      {
        text: "Operations",
        items: [
          { text: "Production guide", link: "/production" },
          { text: "Production checklist", link: "/production-checklist" },
          { text: "CLI reference", link: "/cli" },
          { text: "Failure semantics", link: "/failure-semantics" },
          { text: "Security boundaries", link: "/security-boundaries" }
        ]
      },
      {
        text: "Adapters",
        items: [
          { text: "Adapter tiers", link: "/adapter-tiers" },
          { text: "Adapter authoring", link: "/adapter-authoring" }
        ]
      }
    ],
    socialLinks: [{ icon: "github", link: "https://github.com/KirtiRamchandani/StaleZero" }],
    search: { provider: "local" }
  },
  srcDir: "..",
  srcExclude: ["**/node_modules/**", "**/.vitepress/**", "**/launch/**"],
  ignoreDeadLinks: true
});
