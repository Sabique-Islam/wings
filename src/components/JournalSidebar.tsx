import { useState, useEffect, useRef, useCallback } from "react";
import {
  Plus, FileText, Search, X, LogOut, Download, Star, ChevronRight, Settings,
  Users, Trash2, RotateCcw, Loader2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { exportAllEntries } from "@/lib/export";
import {
  Entry, ShareRole, getEntryTitle, getChildEntries, getRootEntries, groupByMonth,
  getPinnedEntries, fetchTrash, restoreEntry, permanentlyDeleteEntry,
} from "@/lib/journal";
import { useResizable } from "@/hooks/useResizable";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  allEntries: Entry[];
  roleMap: Record<string, ShareRole>;
  userId: string;
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  sidebarOpen: boolean;
  onToggle: () => void;
  onRefetch: () => void;
}

function SectionHeader({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-2 mb-1">
      <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-ink-2">{children}</p>
      {action}
    </div>
  );
}

export function JournalSidebar({
  allEntries, roleMap, userId, activeId, onSelect, onNew, sidebarOpen, onToggle, onRefetch,
}: Props) {
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [trashOpen, setTrashOpen] = useState(false);
  const [trash, setTrash] = useState<Entry[]>([]);
  const [trashLoading, setTrashLoading] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const { signOut } = useAuth();

  const isShared = useCallback(
    (e: Entry) => !!roleMap[e.id] && roleMap[e.id] !== "owner",
    [roleMap],
  );

  const owned = allEntries.filter((e) => !isShared(e));
  const pinned = getPinnedEntries(owned);
  const sharedRoots = allEntries.filter((e) => isShared(e) && !e.parent_id);
  const months = groupByMonth(getRootEntries(owned));

  useEffect(() => {
    if (searching && searchRef.current) searchRef.current.focus();
  }, [searching]);

  useEffect(() => {
    const handler = () => setSearching(true);
    window.addEventListener("nw:search", handler);
    return () => window.removeEventListener("nw:search", handler);
  }, []);

  const loadTrash = useCallback(() => {
    if (!userId) return;
    setTrashLoading(true);
    fetchTrash(userId)
      .then(setTrash)
      .catch(() => setTrash([]))
      .finally(() => setTrashLoading(false));
  }, [userId]);

  const toggleTrash = () => {
    const next = !trashOpen;
    setTrashOpen(next);
    if (next) loadTrash();
  };

  const handleRestore = async (id: string) => {
    try {
      await restoreEntry(id);
      setTrash((t) => t.filter((e) => e.id !== id));
      onRefetch();
    } catch (err) {
      toast.error("Couldn't restore page", { description: (err as Error).message });
    }
  };

  const handlePurge = async (id: string) => {
    try {
      await permanentlyDeleteEntry(id);
      setTrash((t) => t.filter((e) => e.id !== id));
    } catch (err) {
      toast.error("Couldn't delete page", { description: (err as Error).message });
    }
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const { width, onMouseDown } = useResizable({
    storageKey: "nw:sidebarWidth",
    defaultWidth: 260,
    min: 220,
    max: 500,
    side: "left",
  });

  if (!sidebarOpen) return null;

  const q = search.trim().toLowerCase();
  const match = (e: Entry) =>
    getEntryTitle(e).toLowerCase().includes(q) || e.content.toLowerCase().includes(q);

  const filteredMonths = q
    ? months.map((m) => ({ ...m, entries: m.entries.filter(match) })).filter((m) => m.entries.length > 0)
    : months;
  const filteredPinned = q ? pinned.filter(match) : pinned;
  const filteredShared = q ? sharedRoots.filter(match) : sharedRoots;

  const renderEntry = (entry: Entry, depth = 0) => {
    const preview = getEntryTitle(entry);
    const isActive = entry.id === activeId;
    const children = getChildEntries(allEntries, entry.id);
    const hasChildren = children.length > 0;
    const isExpanded = expanded.has(entry.id);

    return (
      <li key={entry.id}>
        <div className="flex items-center group">
          {hasChildren ? (
            <button
              onClick={() => toggleExpand(entry.id)}
              className="p-0.5 text-ink-3 hover:text-ink-1 transition-colors shrink-0"
              aria-label={isExpanded ? "collapse" : "expand"}
            >
              <ChevronRight className={cn("h-3 w-3 transition-transform", isExpanded && "rotate-90")} />
            </button>
          ) : (
            <span className="w-4 shrink-0" />
          )}
          <button
            onClick={() => onSelect(entry.id)}
            className={cn(
              "flex-1 text-left px-1.5 py-1.5 rounded text-xs flex items-center gap-1.5 transition-colors",
              isActive
                ? "bg-accent-soft text-accent-strong"
                : "text-ink-1 hover:bg-accent/50 hover:text-foreground",
            )}
          >
            {entry.pinned ? <Star className="h-3 w-3 shrink-0" /> : <FileText className="h-3 w-3 shrink-0" />}
            <span className="truncate">{preview}</span>
            {hasChildren && <span className="text-[9px] text-ink-3 ml-auto tabular-nums">{children.length}</span>}
          </button>
        </div>
        {hasChildren && isExpanded && !q && (
          <ul className="ml-3 border-l border-border-subtle space-y-0.5 mt-0.5">
            {children.map((child) => renderEntry(child, depth + 1))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <>
      <div onClick={onToggle} className="md:hidden fixed inset-0 bg-overlay/60 backdrop-blur-sm z-40" />
      <aside
        style={{ width }}
        className="relative shrink-0 border-r border-border-subtle bg-sidebar h-screen flex flex-col overflow-hidden max-md:fixed max-md:left-0 max-md:top-0 max-md:z-50 max-md:!w-[85vw] max-md:max-w-[320px] max-md:shadow-4"
      >
        <div
          onMouseDown={onMouseDown}
          className="nw-resize-handle absolute right-0 top-0 bottom-0 w-1.5 translate-x-1/2 cursor-col-resize hover:bg-accent-strong/20 active:bg-accent-strong/30 transition-colors z-50 max-md:hidden"
          title="Drag to resize"
        />

        <div className="p-3.5 flex items-center justify-between border-b border-border-subtle shrink-0">
          <span className="text-xs font-display font-semibold tracking-wide text-foreground">wings</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSearching(!searching)}
              className="text-ink-2 hover:text-foreground transition-colors p-1"
              title="Search (⌘/)"
            >
              {searching ? <X className="h-3.5 w-3.5" /> : <Search className="h-3.5 w-3.5" />}
            </button>
            <button onClick={onNew} className="text-ink-2 hover:text-foreground transition-colors p-1" title="New page (⌘N)">
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {searching && (
          <div className="px-3 py-2 border-b border-border-subtle shrink-0">
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="search pages..."
              className="w-full bg-background border border-border rounded px-2 py-1 text-xs text-foreground placeholder:text-ink-3 focus:outline-none focus:ring-1 focus:ring-ring font-mono"
              onKeyDown={(e) => {
                if (e.key === "Escape") { setSearching(false); setSearch(""); }
              }}
            />
          </div>
        )}

        <nav className="flex-1 min-h-0 overflow-y-auto p-2 space-y-5">
          {filteredPinned.length > 0 && (
            <div>
              <SectionHeader>favorites</SectionHeader>
              <ul className="space-y-0.5">{filteredPinned.map((e) => renderEntry(e))}</ul>
            </div>
          )}

          <div>
            <SectionHeader>pages</SectionHeader>
            {filteredMonths.length === 0 ? (
              <p className="text-xs text-ink-2 px-2 py-1">{q ? "no matches" : "no pages yet"}</p>
            ) : (
              filteredMonths.map((month) => (
                <div key={month.key} className="mb-3">
                  <p className="text-[9px] font-mono uppercase tracking-widest text-ink-3 px-2 mb-1">{month.label}</p>
                  <ul className="space-y-0.5">{month.entries.map((e) => renderEntry(e))}</ul>
                </div>
              ))
            )}
          </div>

          {filteredShared.length > 0 && (
            <div>
              <SectionHeader>
                <span className="flex items-center gap-1.5"><Users className="h-3 w-3" /> shared with me</span>
              </SectionHeader>
              <ul className="space-y-0.5">{filteredShared.map((e) => renderEntry(e))}</ul>
            </div>
          )}
        </nav>

        <div className="border-t border-border-subtle shrink-0">
          <button
            onClick={toggleTrash}
            className="w-full flex items-center gap-1.5 px-3.5 py-2 text-[10px] font-mono uppercase tracking-[0.2em] text-ink-2 hover:text-foreground transition-colors"
          >
            <ChevronRight className={cn("h-3 w-3 transition-transform", trashOpen && "rotate-90")} />
            <Trash2 className="h-3 w-3" /> trash
          </button>
          {trashOpen && (
            <div className="max-h-40 overflow-y-auto px-2 pb-2 space-y-0.5">
              {trashLoading ? (
                <div className="flex items-center gap-2 px-2 py-1.5 text-[10px] text-ink-2"><Loader2 className="h-3 w-3 animate-spin" /> loading…</div>
              ) : trash.length === 0 ? (
                <p className="px-2 py-1.5 text-[10px] text-ink-3">trash is empty</p>
              ) : (
                trash.map((e) => (
                  <div key={e.id} className="flex items-center gap-1 group px-1.5 py-1 rounded hover:bg-accent/40">
                    <span className="flex-1 truncate text-xs text-ink-2">{getEntryTitle(e)}</span>
                    <button onClick={() => handleRestore(e.id)} className="p-1 text-ink-3 hover:text-foreground opacity-0 group-hover:opacity-100 transition" title="Restore">
                      <RotateCcw className="h-3 w-3" />
                    </button>
                    <button onClick={() => handlePurge(e.id)} className="p-1 text-ink-3 hover:text-destructive opacity-0 group-hover:opacity-100 transition" title="Delete forever">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="p-3 border-t border-border-subtle space-y-2 shrink-0">
          <div className="flex items-center justify-between">
            <button onClick={signOut} className="flex items-center gap-2 text-[10px] text-ink-2 hover:text-foreground transition-colors">
              <LogOut className="h-3 w-3" />
              <span className="uppercase tracking-wider font-mono">sign out</span>
            </button>
            <div className="flex items-center gap-2">
              {owned.length > 0 && (
                <button onClick={() => exportAllEntries(owned)} className="text-ink-2 hover:text-foreground transition-colors" title="Export all">
                  <Download className="h-3 w-3" />
                </button>
              )}
              <button onClick={() => window.dispatchEvent(new CustomEvent("nw:settings"))} className="text-ink-2 hover:text-foreground transition-colors" title="Settings">
                <Settings className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="text-[10px] text-ink-3 font-mono">⌘K palette · ⌘N new · ⌘/ search</div>
        </div>
      </aside>
    </>
  );
}
