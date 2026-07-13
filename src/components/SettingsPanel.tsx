import { useState, useEffect, useCallback } from "react";
import {
  X, Sun, Moon, Monitor, User, Palette, Sparkles, Plug, Bell, Download,
  CreditCard, AlertTriangle, Eye, EyeOff, Check, Github, MessageCircle,
} from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { PROVIDERS } from "@/lib/ai/providers";
import {
  getActiveProvider, setActiveProvider, getApiKeyFor, setApiKeyFor, clearApiKeyFor,
  getModelFor, setModelFor,
} from "@/lib/ai/storage";
import { setUsername as saveUsername } from "@/lib/profile";
import { SOCIAL } from "@/config/navigation";
import { Link } from "react-router-dom";

const PRESET_COLORS = [
  "#6366f1", "#8b5cf6", "#a855f7", "#ec4899",
  "#f43f5e", "#ef4444", "#f97316", "#eab308",
  "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
];

type TabId = "account" | "appearance" | "ai" | "connections" | "notifications" | "data" | "billing" | "danger";

const TABS: { id: TabId; label: string; icon: typeof User }[] = [
  { id: "account", label: "account", icon: User },
  { id: "appearance", label: "appearance", icon: Palette },
  { id: "ai", label: "ai", icon: Sparkles },
  { id: "connections", label: "connections", icon: Plug },
  { id: "notifications", label: "notifications", icon: Bell },
  { id: "data", label: "import / export", icon: Download },
  { id: "billing", label: "billing", icon: CreditCard },
  { id: "danger", label: "danger zone", icon: AlertTriangle },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-ink-2">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full bg-background border border-border rounded px-3 py-1.5 text-sm text-foreground placeholder:text-ink-3 focus:outline-none focus:ring-1 focus:ring-ring font-mono";

export function SettingsPanel() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<TabId>("account");
  const { theme, setTheme, accentColor, setAccentColor } = useTheme();
  const { user, signOut } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [username, setUsernameState] = useState("");
  const [usernameMsg, setUsernameMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // AI tab state
  const [provider, setProvider] = useState(() => getActiveProvider());
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [showKey, setShowKey] = useState(false);
  const providerObj = PROVIDERS.find((p) => p.id === provider);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("nw:settings", handler);
    return () => window.removeEventListener("nw:settings", handler);
  }, []);

  useEffect(() => {
    if (!user || !open) return;
    supabase
      .from("user_preferences")
      .select("display_name, username")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.display_name) setDisplayName(data.display_name);
        if (data?.username) setUsernameState(data.username);
      });
  }, [user, open]);

  useEffect(() => {
    setApiKey(getApiKeyFor(provider));
    setModel(getModelFor(provider));
  }, [provider]);

  const savePref = useCallback(async (patch: Record<string, unknown>) => {
    if (!user) return;
    const { data: existing } = await supabase
      .from("user_preferences")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (existing) {
      await supabase.from("user_preferences").update(patch as any).eq("user_id", user.id);
    } else {
      await supabase.from("user_preferences").insert({ user_id: user.id, ...patch } as any);
    }
  }, [user]);

  const saveName = async () => {
    if (!user) return;
    setSaving(true);
    await savePref({ display_name: displayName });
    setSaving(false);
  };

  const handleUsername = async () => {
    if (!user || !username.trim()) return;
    const res = await saveUsername(user.id, username);
    setUsernameMsg(res.ok ? "saved" : res.error || "error");
    setTimeout(() => setUsernameMsg(null), 2500);
  };

  const pickTheme = (t: typeof theme) => {
    setTheme(t);
    savePref({ theme: t });
  };
  const pickAccent = (c: string) => {
    setAccentColor(c);
    savePref({ accent_color: c });
  };

  const saveAI = () => {
    setActiveProvider(provider);
    if (apiKey) setApiKeyFor(provider, apiKey); else clearApiKeyFor(provider);
    if (model) setModelFor(provider, model);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay/70 backdrop-blur-sm p-4" onClick={() => setOpen(false)}>
      <div
        className="relative bg-surface-1 border border-border-subtle rounded-xl shadow-4 w-full max-w-3xl h-[min(600px,88vh)] flex overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tab rail */}
        <div className="w-44 shrink-0 border-r border-border-subtle bg-sidebar flex flex-col">
          <div className="px-4 py-4 text-xs font-display font-semibold tracking-wide">settings</div>
          <nav className="flex-1 overflow-y-auto px-2 space-y-0.5">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-2.5 py-2 rounded text-xs font-mono transition-colors",
                  tab === t.id
                    ? "bg-accent-soft text-accent-strong"
                    : t.id === "danger"
                      ? "text-destructive/80 hover:bg-accent/40"
                      : "text-ink-1 hover:bg-accent/40 hover:text-foreground",
                )}
              >
                <t.icon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{t.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-subtle shrink-0">
            <span className="text-sm font-display font-semibold capitalize">{TABS.find((t) => t.id === tab)?.label}</span>
            <button onClick={() => setOpen(false)} className="text-ink-2 hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-6">
            {tab === "account" && (
              <>
                <Field label="display name">
                  <div className="flex gap-2">
                    <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="your name" className={inputCls} onBlur={saveName} onKeyDown={(e) => e.key === "Enter" && saveName()} />
                    {saving && <span className="text-[10px] text-ink-2 self-center animate-pulse">saving…</span>}
                  </div>
                </Field>
                <Field label="username">
                  <div className="flex gap-2">
                    <input value={username} onChange={(e) => setUsernameState(e.target.value)} placeholder="username" className={inputCls} />
                    <button onClick={handleUsername} className="rounded bg-foreground text-background text-xs font-mono px-3 hover:bg-foreground/90 transition-colors">save</button>
                  </div>
                  {usernameMsg && <p className="text-[10px] text-ink-2">{usernameMsg}</p>}
                </Field>
                <Field label="email">
                  <div className={cn(inputCls, "text-ink-2 select-all")}>{user?.email}</div>
                </Field>
                <button onClick={signOut} className="text-xs font-mono text-ink-2 hover:text-destructive transition-colors">sign out →</button>
              </>
            )}

            {tab === "appearance" && (
              <>
                <Field label="theme">
                  <div className="flex gap-2">
                    {([
                      { value: "light" as const, icon: Sun, label: "light" },
                      { value: "dark" as const, icon: Moon, label: "dark" },
                      { value: "system" as const, icon: Monitor, label: "system" },
                    ]).map(({ value, icon: Icon, label }) => (
                      <button
                        key={value}
                        onClick={() => pickTheme(value)}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded border text-xs font-mono transition-colors",
                          theme === value ? "border-accent-strong bg-accent-soft text-accent-strong" : "border-border-subtle text-ink-2 hover:bg-accent/50",
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" /> {label}
                      </button>
                    ))}
                  </div>
                </Field>

                <Field label="accent color">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => pickAccent("")}
                      className={cn("w-7 h-7 rounded-full border-2 transition-all", !accentColor ? "border-foreground scale-110" : "border-border-subtle")}
                      style={{ background: "linear-gradient(135deg, hsl(0 0% 40%) 50%, hsl(0 0% 60%) 50%)" }}
                      title="monochrome"
                    />
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => pickAccent(color)}
                        className={cn("w-7 h-7 rounded-full border-2 transition-all", accentColor === color ? "border-foreground scale-110" : "border-transparent")}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                    <label className="relative">
                      <input type="color" value={accentColor || "#6366f1"} onChange={(e) => pickAccent(e.target.value)} className="absolute inset-0 w-7 h-7 opacity-0 cursor-pointer" />
                      <div className="w-7 h-7 rounded-full border-2 border-dashed border-ink-3 flex items-center justify-center text-ink-2 text-[10px] cursor-pointer hover:border-foreground transition-colors">+</div>
                    </label>
                  </div>
                </Field>

                {/* Live preview */}
                <Field label="preview">
                  <div className="rounded-lg border border-border-subtle bg-surface-0 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-accent-strong text-accent-strong-foreground px-3 py-1.5 text-xs font-mono">primary <Check className="h-3 w-3" /></span>
                      <span className="inline-flex items-center rounded-md border border-border-strong px-3 py-1.5 text-xs font-mono">ghost</span>
                      <span className="rounded-full bg-accent-soft text-accent-strong px-2.5 py-1 text-[10px] font-mono uppercase tracking-widest">chip</span>
                    </div>
                    <p className="text-xs text-ink-1 font-sans">
                      an <a className="text-accent-strong underline underline-offset-2" href="#">accent link</a> and a{" "}
                      <span className="dither dither--bayer dither--accent inline-block h-3 w-16 align-middle rounded-sm" />
                    </p>
                  </div>
                </Field>
              </>
            )}

            {tab === "ai" && (
              <>
                <Field label="provider">
                  <select value={provider} onChange={(e) => setProvider(e.target.value)} className={inputCls}>
                    {PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                </Field>
                <Field label={`${providerObj?.label ?? ""} api key`}>
                  <div className="flex items-center gap-1">
                    <input type={showKey ? "text" : "password"} value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={providerObj?.keyPlaceholder || "API key"} className={inputCls} />
                    <button onClick={() => setShowKey((s) => !s)} className="p-1.5 rounded text-ink-2 hover:text-foreground">
                      {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  {providerObj?.keyHelpUrl && (
                    <p className="text-[10px] text-ink-2">stored in your browser. get one at{" "}
                      <a href={providerObj.keyHelpUrl} target="_blank" rel="noreferrer" className="underline hover:text-foreground">{providerObj.keyHelpUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}</a>.
                    </p>
                  )}
                </Field>
                <Field label="model">
                  <select value={model} onChange={(e) => setModel(e.target.value)} className={inputCls}>
                    {(providerObj?.models || []).map((m) => (
                      <option key={m.id} value={m.id}>{m.label}{m.vision ? " · 👁" : ""}{m.image ? " · 🎨" : ""}</option>
                    ))}
                  </select>
                </Field>
                <div className="flex items-center gap-2">
                  <button onClick={saveAI} className="rounded bg-accent-strong text-accent-strong-foreground text-xs font-mono px-4 py-1.5 hover:bg-accent-strong-hover transition-colors">save</button>
                  {getApiKeyFor(provider) && (
                    <button onClick={() => { clearApiKeyFor(provider); setApiKey(""); }} className="text-[10px] font-mono text-ink-2 hover:text-destructive">clear key</button>
                  )}
                </div>
              </>
            )}

            {tab === "connections" && (
              <div className="space-y-3">
                <p className="text-sm text-ink-1 font-sans">link external accounts and communities.</p>
                <a href={SOCIAL.github} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-lg border border-border-subtle p-3 hover:border-border-strong transition-colors">
                  <Github className="h-4 w-4" /> <span className="text-sm font-mono">github</span> <span className="ml-auto text-[10px] text-ink-2 font-mono">open ↗</span>
                </a>
                <a href={SOCIAL.discord} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-lg border border-border-subtle p-3 hover:border-border-strong transition-colors">
                  <MessageCircle className="h-4 w-4" /> <span className="text-sm font-mono">discord</span> <span className="ml-auto text-[10px] text-ink-2 font-mono">join ↗</span>
                </a>
              </div>
            )}

            {tab === "notifications" && (
              <div className="space-y-4">
                {[
                  { l: "product updates", d: "occasional emails about new features." },
                  { l: "mentions & comments", d: "when someone mentions you or replies." },
                  { l: "shared page activity", d: "changes to pages shared with you." },
                ].map((n, i) => (
                  <label key={n.l} className="flex items-start justify-between gap-4 cursor-pointer">
                    <span>
                      <span className="block text-sm font-sans text-ink-0">{n.l}</span>
                      <span className="block text-xs text-ink-2 font-sans">{n.d}</span>
                    </span>
                    <input type="checkbox" defaultChecked={i === 0} className="mt-1 h-4 w-4 accent-[hsl(var(--accent-strong))]" />
                  </label>
                ))}
              </div>
            )}

            {tab === "data" && (
              <div className="space-y-3">
                <p className="text-sm text-ink-1 font-sans">export happens per-page from the editor toolbar, or export everything from the sidebar.</p>
                <div className="rounded-lg border border-border-subtle p-3 text-xs font-mono text-ink-2">
                  export formats: markdown (.md), json (.json)
                </div>
                <p className="text-xs text-ink-2 font-sans">import: use the editor toolbar → import file(s) to bring markdown/json into a page.</p>
              </div>
            )}

            {tab === "billing" && (
              <div className="space-y-3">
                <div className="rounded-lg border border-border-subtle p-4">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-ink-2">current plan</div>
                  <div className="text-2xl font-display font-bold mt-1">Free</div>
                </div>
                <Link to="/pricing" className="inline-flex rounded-md bg-accent-strong text-accent-strong-foreground text-xs font-mono px-4 py-2 hover:bg-accent-strong-hover transition-colors">view plans →</Link>
              </div>
            )}

            {tab === "danger" && (
              <div className="space-y-4">
                <div className="rounded-lg border border-destructive/40 p-4 space-y-3">
                  <div className="text-sm font-display font-semibold text-destructive">delete account</div>
                  <p className="text-xs text-ink-2 font-sans">permanently removes your account and all pages. this cannot be undone.</p>
                  <button className="rounded-md border border-destructive/60 text-destructive text-xs font-mono px-3 py-1.5 hover:bg-destructive/10 transition-colors" onClick={() => window.dispatchEvent(new CustomEvent("wings:contact-support"))}>request deletion</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
