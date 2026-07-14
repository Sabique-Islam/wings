import { useState, useEffect, useRef, useCallback } from "react";
import {
  Sparkles, Send, X, Settings, Loader2, Square,
  PenLine, FilePlus2, Wand2, Eye, EyeOff, Image as ImageIcon,
} from "lucide-react";
import { useResizable } from "@/hooks/useResizable";
import { marked } from "marked";
import { Entry, getEntryTitle, createEntry } from "@/lib/journal";
import { ChatMessage } from "@/lib/ai/types";
import { streamChat, generateImage } from "@/lib/ai/client";
import { PROVIDERS, getProvider } from "@/lib/ai/providers";
import {
  getActiveProvider, setActiveProvider,
  getApiKeyFor, setApiKeyFor, clearApiKeyFor,
  getModelFor, setModelFor,
} from "@/lib/ai/storage";
import { collectDrawingsFromContent, snapshotsAsAttachments } from "@/lib/ai/excalidrawContext";
import { uploadImage } from "@/lib/imageUpload";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  activeEntry: Entry | null;
  allEntries: Entry[];
  onCreateEntry: (entry: Entry) => void;
  onNavigate: (id: string) => void;
}

interface UIMessage extends ChatMessage {
  id: string;
  pending?: boolean;
  actions?: { label: string; onClick: () => void }[];
}

const SYSTEM_PROMPT = `You are an embedded writing assistant inside Wings, a Notion-style markdown editor.
You help the user think, write, organize pages, and can even generate images.

You may emit fenced action blocks at the start of a line. Use them ONLY when the user wants you to modify their workspace. Otherwise just chat in markdown.

Tools (each must be its own fenced block):

\`\`\`tool:write
<markdown to APPEND to the current page>
\`\`\`

\`\`\`tool:replace
<markdown that REPLACES the entire current page>
\`\`\`

\`\`\`tool:newpage
title: <title>
---
<markdown body>
\`\`\`

\`\`\`tool:image
<image prompt — a clear, descriptive sentence>
\`\`\`

Rules:
- Markdown only: # headings, lists, tables, code, math ($...$ / $$...$$), task lists (- [ ]).
- If excalidraw drawings from the current page are attached as images, reference them naturally.
- Keep prose tight. No fluff.
`;

function parseToolBlocks(text: string): { stripped: string; tools: { kind: string; body: string }[] } {
  const tools: { kind: string; body: string }[] = [];
  const re = /```tool:(write|replace|newpage|image)\s*\n([\s\S]*?)```/g;
  const stripped = text.replace(re, (_m, kind, body) => {
    tools.push({ kind, body: body.trim() });
    return "";
  });
  return { stripped: stripped.trim(), tools };
}

export function AIAssistant({ open, onClose, activeEntry, allEntries, onCreateEntry, onNavigate }: Props) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Settings draft state — committed to storage when user hits Save.
  const [provider, setProviderState] = useState(getActiveProvider());
  const [apiKey, setApiKeyState] = useState(getApiKeyFor(getActiveProvider()));
  const [model, setModelState] = useState(getModelFor(getActiveProvider()));
  const [showKey, setShowKey] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Re-sync settings draft whenever the panel opens or provider changes.
  useEffect(() => {
    setProviderState(getActiveProvider());
    setApiKeyState(getApiKeyFor(getActiveProvider()));
    setModelState(getModelFor(getActiveProvider()));
    if (!getApiKeyFor(getActiveProvider())) setShowSettings(true);
  }, [open]);

  useEffect(() => {
    // When user picks a different provider in the dropdown, surface that
    // provider's key + model.
    setApiKeyState(getApiKeyFor(provider));
    setModelState(getModelFor(provider));
  }, [provider]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  const applyTools = useCallback(async (tools: { kind: string; body: string }[]): Promise<{ label: string; onClick: () => void }[]> => {
    const actions: { label: string; onClick: () => void }[] = [];
    const editor = (window as any).__nw_editor;

    for (const t of tools) {
      if (t.kind === "write" && editor) {
        editor.chain().focus("end").insertContent("\n\n" + t.body).run();
        actions.push({ label: "Wrote to page", onClick: () => {} });
      } else if (t.kind === "replace" && editor) {
        editor.commands.setContent(t.body);
        actions.push({ label: "Replaced page", onClick: () => {} });
      } else if (t.kind === "newpage" && user) {
        const lines = t.body.split("\n");
        let title = "";
        let bodyStart = 0;
        if (lines[0]?.toLowerCase().startsWith("title:")) {
          title = lines[0].slice(6).trim();
          bodyStart = 1;
          if (lines[1]?.trim() === "---") bodyStart = 2;
        }
        const body = lines.slice(bodyStart).join("\n").trim();
        const content = title ? `# ${title}\n\n${body}` : body;
        try {
          const parentId = activeEntry?.id;
          const ownerId = activeEntry && activeEntry.user_id !== user.id
            ? activeEntry.user_id
            : user.id;
          const entry = await createEntry(ownerId, content, parentId);
          onCreateEntry(entry);
          onNavigate(entry.id);
          actions.push({ label: `Opened "${title || "new page"}"`, onClick: () => onNavigate(entry.id) });
        } catch (e) {
          console.error("create page failed", e);
          toast.error("Couldn't create page", { description: (e as Error).message });
        }
      } else if (t.kind === "image" && editor && user) {
        try {
          const { base64, mimeType } = await generateImage(t.body);
          // Convert base64 -> File and upload to Supabase storage so the image
          // survives reloads and exports.
          const bin = atob(base64);
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          const file = new File([bytes], `ai-${Date.now()}.png`, { type: mimeType });
          const url = await uploadImage(file, user.id);
          if (url) {
            editor.chain().focus("end").setImage({ src: url }).run();
            actions.push({ label: "Inserted AI image", onClick: () => {} });
          }
        } catch (e: any) {
          console.error("image gen failed", e);
          actions.push({ label: `Image failed: ${e?.message || "unknown"}`, onClick: () => {} });
        }
      }
    }
    return actions;
  }, [activeEntry, user, onCreateEntry, onNavigate]);

  const buildContext = useCallback(() => {
    const pages = allEntries.slice(0, 30).map((e) => `- ${getEntryTitle(e)} (id:${e.id})`).join("\n");
    let ctx = `## User's workspace\nPages (most recent first):\n${pages || "(none)"}\n\n`;
    if (activeEntry) {
      const liveContent = (window as any).__nw_getMarkdown?.() ?? activeEntry.content;
      const drawings = collectDrawingsFromContent(liveContent);
      ctx += `## Currently open page\nTitle: ${getEntryTitle(activeEntry)}\n\nContent:\n\`\`\`md\n${liveContent.slice(0, 6000)}\n\`\`\``;
      if (drawings.length) {
        ctx += `\n\n## Excalidraw drawings on this page\n` +
          drawings.map((d, i) => `- drawing ${i + 1}: sceneId=${d.sceneId}, elements=${d.elementCount}${d.imageUrl ? " (image attached below)" : ""}`).join("\n");
      }
    } else {
      ctx += "## Currently open page\n(none — user is on the home view)";
    }
    return ctx;
  }, [activeEntry, allEntries]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;
    if (!getApiKeyFor(getActiveProvider())) { setShowSettings(true); return; }

    const userMsg: UIMessage = { id: crypto.randomUUID(), role: "user", content: text };
    const asstMsg: UIMessage = { id: crypto.randomUUID(), role: "model", content: "", pending: true };
    setMessages((prev) => [...prev, userMsg, asstMsg]);
    setInput("");
    setStreaming(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    // Gather excalidraw snapshots for the active page. We attach them on
    // EVERY request so the AI always has the latest drawing context for this
    // file session — providers/models that don't accept images will simply
    // ignore the attachments.
    let images: { base64: string; mimeType: string }[] | undefined;
    if (activeEntry) {
      const liveContent = (window as any).__nw_getMarkdown?.() ?? activeEntry.content;
      const snaps = collectDrawingsFromContent(liveContent);
      if (snaps.length) {
        images = await snapshotsAsAttachments(snaps);
        if (!images.length) images = undefined;
      }
    }

    const history: ChatMessage[] = [
      { role: "user", content: buildContext() },
      { role: "model", content: "Understood. I have your workspace context." },
      ...messages.map<ChatMessage>((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: text },
    ];

    try {
      let acc = "";
      for await (const chunk of streamChat({
        messages: history,
        systemInstruction: SYSTEM_PROMPT,
        signal: ctrl.signal,
        images,
      })) {
        acc += chunk;
        setMessages((prev) => prev.map((m) => (m.id === asstMsg.id ? { ...m, content: acc } : m)));
      }

      const { stripped, tools } = parseToolBlocks(acc);
      const actions = tools.length ? await applyTools(tools) : [];
      setMessages((prev) =>
        prev.map((m) =>
          m.id === asstMsg.id
            ? { ...m, content: stripped || (tools.length ? "_(applied to your page)_" : acc), pending: false, actions }
            : m
        )
      );
    } catch (e: any) {
      const msg = e?.name === "AbortError" ? "_(stopped)_" : `❌ ${e?.message || "Failed"}`;
      setMessages((prev) => prev.map((m) => (m.id === asstMsg.id ? { ...m, content: msg, pending: false } : m)));
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [input, streaming, messages, buildContext, applyTools, activeEntry]);

  const stop = () => abortRef.current?.abort();

  const saveSettings = () => {
    setActiveProvider(provider);
    setApiKeyFor(provider, apiKey);
    setModelFor(provider, model);
    setShowSettings(false);
  };

  const { width, onMouseDown } = useResizable({
    storageKey: "nw:aiWidth", defaultWidth: 420, min: 320, max: 720, side: "right",
  });

  if (!open) return null;

  const providerObj = getProvider(provider);
  const activeProviderObj = getProvider(getActiveProvider());
  const activeModelId = getModelFor(getActiveProvider());

  return (
    <aside
      style={{ width }}
      className="fixed top-0 right-0 bottom-0 z-40 bg-card border-l border-border flex flex-col shadow-2xl animate-in slide-in-from-right duration-200 max-w-full max-md:inset-0 max-md:!w-full max-md:z-50"
    >
      <div
        onMouseDown={onMouseDown}
        className="nw-resize-handle absolute left-0 top-0 bottom-0 w-1.5 -translate-x-1/2 cursor-col-resize hover:bg-primary/20 active:bg-primary/30 transition-colors z-50 hidden md:block"
        title="Drag to resize"
      />

      <div className="h-11 flex items-center px-3 border-b border-border gap-2 shrink-0 bg-gradient-to-b from-card to-card/80">
        <Sparkles className={`h-3.5 w-3.5 text-foreground ${streaming ? "nw-sparkle-anim" : ""}`} />
        <div className="flex flex-col leading-tight min-w-0">
          <span className="text-[11px] font-semibold tracking-tight">AI Assistant</span>
          <span className="text-[9px] text-muted-foreground/70 font-mono truncate max-w-[200px]">
            {activeProviderObj?.label || "—"} · {activeModelId}
          </span>
        </div>
        <span className="nw-ascii-bar ml-2 hidden sm:inline-block" aria-hidden />
        <div className="ml-auto flex items-center gap-0.5">
          <button onClick={() => setShowSettings((s) => !s)} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors" title="AI settings">
            <Settings className="h-3.5 w-3.5" />
          </button>
          <button onClick={onClose} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors" title="Close (⌘J)">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="p-3 border-b border-border bg-secondary/30 space-y-3">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Provider</label>
            <select
              value={provider}
              onChange={(e) => setProviderState(e.target.value)}
              className="w-full mt-1 bg-background border border-border rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground">{providerObj?.label} API key</label>
            <div className="flex items-center gap-1 mt-1">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKeyState(e.target.value)}
                placeholder={providerObj?.keyPlaceholder || "API key"}
                className="flex-1 bg-background border border-border rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <button onClick={() => setShowKey((s) => !s)} className="p-1.5 rounded text-muted-foreground hover:text-foreground" title={showKey ? "Hide" : "Show"}>
                {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground/70 mt-1">
              Stored in your browser only. Get one at{" "}
              <a href={providerObj?.keyHelpUrl} target="_blank" rel="noreferrer" className="underline hover:text-foreground">
                {(providerObj?.keyHelpUrl || "").replace(/^https?:\/\//, "").replace(/\/$/, "")}
              </a>.
            </p>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Model</label>
            <select
              value={model}
              onChange={(e) => setModelState(e.target.value)}
              className="w-full mt-1 bg-background border border-border rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {(providerObj?.models || []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}{m.vision ? " · 👁" : ""}{m.image ? " · 🎨" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={saveSettings} className="flex-1 bg-primary text-primary-foreground text-xs font-medium rounded px-3 py-1.5 hover:opacity-90 transition-opacity">
              Save
            </button>
            {getApiKeyFor(provider) && (
              <button onClick={() => { clearApiKeyFor(provider); setApiKeyState(""); }} className="text-[10px] text-muted-foreground hover:text-destructive px-2">
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && !showSettings && (
          <div className="text-center text-muted-foreground/80 py-6 space-y-4">
            <pre className="text-[10px] leading-tight font-mono select-none text-muted-foreground/40 mx-auto inline-block text-left">
{`  ╭─────────────╮
  │  ai · write │
  │  ─────────  │
  │  ⌘J  toggle │
  ╰─────────────╯`}
            </pre>
            <p className="text-[11px]">Ask me to write, edit, create pages, or generate images.</p>
            <div className="grid gap-1.5 max-w-[300px] mx-auto">
              {[
                { icon: PenLine, label: "Continue writing this page" },
                { icon: Wand2, label: "Summarize this page in 3 bullets" },
                { icon: FilePlus2, label: "Create a meeting notes page for tomorrow" },
                { icon: ImageIcon, label: "Generate an image of a serene mountain at dawn" },
              ].map((s) => (
                <button key={s.label} onClick={() => setInput(s.label)} className="nw-ai-chip">
                  <s.icon className="h-3 w-3 shrink-0 opacity-70" />
                  <span className="truncate">{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-1 duration-200`}>
            <div className={`max-w-[88%] ai-msg-bubble ${m.role === "user" ? "user" : "assistant"}`}>
              {m.pending && !m.content ? (
                <div className="flex items-center gap-2 py-0.5">
                  <span className="nw-shimmer text-[11px] font-medium">thinking</span>
                  <span className="nw-ascii-bar" aria-hidden />
                </div>
              ) : (
                <div
                  className="ai-msg-prose"
                  dangerouslySetInnerHTML={{
                    __html: (marked.parse(m.content || "", { async: false }) as string) +
                      (m.pending ? '<span class="nw-caret"></span>' : ""),
                  }}
                />
              )}
              {m.actions && m.actions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {m.actions.map((a, i) => (
                    <button key={i} onClick={a.onClick} className="text-[10px] bg-background/40 hover:bg-background/80 rounded px-2 py-0.5 transition-colors border border-border/40">
                      {a.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="p-2.5 border-t border-border shrink-0 bg-card/60">
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
            }}
            placeholder="Ask AI to write, edit, create, or generate images…"
            rows={2}
            className="nw-ai-input"
          />
          {streaming ? (
            <button onClick={stop} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded text-destructive hover:bg-accent transition-colors" title="Stop">
              <Square className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button onClick={send} disabled={!input.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded text-foreground hover:bg-accent disabled:opacity-30 transition-colors" title="Send (Enter)">
              <Send className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center justify-between text-[9px] text-muted-foreground/50 mt-1.5 px-1 font-mono">
          <span>⏎ send · ⇧⏎ newline</span>
          <span className="flex items-center gap-1">
            <span className={`h-1.5 w-1.5 rounded-full ${getApiKeyFor(getActiveProvider()) ? "bg-foreground/60" : "bg-destructive/70"}`} />
            {getApiKeyFor(getActiveProvider()) ? "key linked" : "no key"}
          </span>
        </div>
      </div>
    </aside>
  );
}
