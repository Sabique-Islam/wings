import { useState, useEffect, useRef, useCallback } from "react";
import { Entry } from "@/lib/journal";

interface Props {
  entries: Entry[];
  onSelect: (id: string) => void;
  onLinkPage?: (entry: Entry) => void;
}

function getTitle(entry: Entry): string {
  return entry.title || entry.content.split("\n")[0].replace(/^#+\s*/, "").slice(0, 60) || "Untitled";
}

export function QuickSwitcher({ entries, onSelect, onLinkPage }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"jump" | "link">("jump");
  const [query, setQuery] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        setMode("jump");
        setOpen(true);
        setQuery("");
        setIdx(0);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const handler = () => {
      setMode("link");
      setOpen(true);
      setQuery("");
      setIdx(0);
    };
    window.addEventListener("nw:linkpage", handler);
    return () => window.removeEventListener("nw:linkpage", handler);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const filtered = entries.filter((e) => {
    const t = getTitle(e).toLowerCase();
    const q = query.toLowerCase();
    return t.includes(q) || e.content.toLowerCase().includes(q);
  });

  const pick = useCallback((entry: Entry) => {
    if (mode === "link" && onLinkPage) {
      onLinkPage(entry);
    } else {
      onSelect(entry.id);
    }
    setOpen(false);
  }, [mode, onSelect, onLinkPage]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]" onClick={() => setOpen(false)}>
      <div className="fixed inset-0 bg-background/80" />
      <div
        className="relative w-full max-w-md bg-card border border-border rounded-lg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIdx(0); }}
          placeholder={mode === "link" ? "Link to page…" : "Jump to entry…"}
          className="w-full bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none font-mono border-b border-border"
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
            if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(i + 1, filtered.length - 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
            if (e.key === "Enter" && filtered[idx]) pick(filtered[idx]);
          }}
        />
        <ul className="max-h-64 overflow-y-auto py-1">
          {filtered.length === 0 && (
            <li className="px-4 py-3 text-xs text-muted-foreground/50 font-mono">no results</li>
          )}
          {filtered.slice(0, 20).map((entry, i) => (
            <li key={entry.id}>
              <button
                onClick={() => pick(entry)}
                className={`w-full text-left px-4 py-2 text-xs font-mono flex items-center gap-2 transition-colors ${
                  i === idx ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50"
                }`}
              >
                <span className="truncate flex-1">{getTitle(entry)}</span>
                <span className="text-[10px] text-muted-foreground/30 shrink-0">
                  {new Date(entry.created_at).toLocaleDateString("default", { month: "short", day: "numeric" })}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div className="border-t border-border px-4 py-1.5 text-[10px] text-muted-foreground/30 font-mono">
          ↑↓ navigate · enter {mode === "link" ? "insert link" : "select"} · esc close
        </div>
      </div>
    </div>
  );
}
