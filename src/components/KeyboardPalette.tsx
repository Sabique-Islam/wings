import { useState, useEffect } from "react";
import { Keyboard, X } from "lucide-react";

const shortcuts = [
  { keys: "⌘ K", desc: "Command palette" },
  { keys: "⌘ N", desc: "New page" },
  { keys: "⌘ P", desc: "Quick switcher" },
  { keys: "⌘ /", desc: "Search sidebar" },
  { keys: "⌘ B", desc: "Toggle sidebar" },
  { keys: "⌘ ?", desc: "Keyboard shortcuts" },
  { keys: "⌘ ⇧ S", desc: "Strikethrough" },
  { keys: "⌘ B", desc: "Bold" },
  { keys: "⌘ I", desc: "Italic" },
  { keys: "⌘ E", desc: "Inline code" },
  { keys: "/", desc: "Slash commands" },
];

export function KeyboardPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "?") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Listen for custom event from palette button
  useEffect(() => {
    const handler = () => setOpen((o) => !o);
    window.addEventListener("nw:shortcuts", handler);
    return () => window.removeEventListener("nw:shortcuts", handler);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setOpen(false)}>
      <div className="fixed inset-0 bg-background/60" />
      <div
        className="relative bg-card border border-border rounded-lg shadow-2xl w-80 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2 text-xs text-foreground font-mono">
            <Keyboard className="h-3.5 w-3.5" />
            <span>keyboard shortcuts</span>
          </div>
          <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <ul className="py-2 max-h-80 overflow-y-auto">
          {shortcuts.map((s, i) => (
            <li key={i} className="flex items-center justify-between px-4 py-1.5">
              <span className="text-xs text-muted-foreground font-mono">{s.desc}</span>
              <kbd className="text-[10px] bg-secondary text-secondary-foreground px-2 py-0.5 rounded font-mono">{s.keys}</kbd>
            </li>
          ))}
        </ul>
        <div className="border-t border-border px-4 py-2 text-[10px] text-muted-foreground/30 font-mono">
          ⌘? to toggle
        </div>
      </div>
    </div>
  );
}
