/**
 * WebMCP (navigator.modelContext) registration for browser agents.
 * @see https://webmachinelearning.github.io/webmcp/
 */

type JsonSchema = Record<string, unknown>;

interface WebMcpTool {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  execute: (args: Record<string, unknown>) => Promise<unknown> | unknown;
}

interface ModelContextApi {
  registerTool?: (tool: WebMcpTool) => void | (() => void);
  provideContext?: (ctx: { tools: WebMcpTool[] }) => void | (() => void);
}

function getModelContext(): ModelContextApi | null {
  if (typeof navigator === "undefined") return null;
  const nav = navigator as Navigator & { modelContext?: ModelContextApi };
  return nav.modelContext ?? null;
}

const MARKETING_PATHS: Record<string, string> = {
  home: "/",
  pricing: "/pricing",
  docs: "/docs",
  about: "/about",
  roadmap: "/roadmap",
  contact: "/contact",
  support: "/support",
  auth: "/auth",
};

export function registerLandingWebMcp(): () => void {
  const ctx = getModelContext();
  if (!ctx) return () => {};

  const tools: WebMcpTool[] = [
    {
      name: "get_product_summary",
      description: "Return a short summary of what Wings is and how to sign in.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      execute: () => ({
        name: "Wings",
        url: "https://wings.nopejs.me",
        summary:
          "Private notes journal with block editor, LaTeX, Excalidraw, and BYOK AI. Sign in at /auth with Google or magic link. No public third-party HTTP API.",
        docs: "https://wings.nopejs.me/docs",
        llmsTxt: "https://wings.nopejs.me/llms.txt",
      }),
    },
    {
      name: "navigate_to_page",
      description: "Navigate the browser to a Wings marketing or auth page.",
      inputSchema: {
        type: "object",
        properties: {
          page: {
            type: "string",
            enum: Object.keys(MARKETING_PATHS),
            description: "Logical page name",
          },
        },
        required: ["page"],
        additionalProperties: false,
      },
      execute: (args) => {
        const page = String(args.page ?? "");
        const path = MARKETING_PATHS[page];
        if (!path) {
          return { ok: false, error: `Unknown page: ${page}` };
        }
        window.location.assign(path);
        return { ok: true, path };
      },
    },
    {
      name: "open_docs",
      description: "Open Wings documentation (HTML or prefer markdown URL).",
      inputSchema: {
        type: "object",
        properties: {
          format: {
            type: "string",
            enum: ["html", "markdown"],
            default: "html",
          },
        },
        additionalProperties: false,
      },
      execute: (args) => {
        const format = args.format === "markdown" ? "markdown" : "html";
        const path = format === "markdown" ? "/docs.md" : "/docs";
        window.location.assign(path);
        return { ok: true, path };
      },
    },
  ];

  const cleanups: Array<() => void> = [];

  if (typeof ctx.registerTool === "function") {
    for (const tool of tools) {
      const result = ctx.registerTool(tool);
      if (typeof result === "function") cleanups.push(result);
    }
  } else if (typeof ctx.provideContext === "function") {
    const result = ctx.provideContext({ tools });
    if (typeof result === "function") cleanups.push(result);
  }

  return () => {
    for (const fn of cleanups) fn();
  };
}
