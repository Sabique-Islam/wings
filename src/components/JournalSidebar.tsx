import { useState, useEffect, useRef, useCallback, memo, type ReactNode } from "react";
import {
  Plus,
  FileText,
  Search,
  X,
  LogOut,
  Download,
  Pin,
  ChevronRight,
  Settings,
  Trash2,
  RotateCcw,
  Loader2,
  PanelLeft,
  LayoutGrid,
  MoreHorizontal,
} from "lucide-react";
import {
  Sidebar,
  SidebarProvider,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { exportAllEntries } from "@/lib/export";
import {
  Entry,
  ShareRole,
  getEntryTitle,
  getChildEntries,
  getRootEntries,
  groupByMonth,
  getPinnedEntries,
  fetchTrash,
  restoreEntry,
  permanentlyDeleteEntry,
} from "@/lib/journal";
import { isDescendantOf, type DropPlacement } from "@/lib/pageOrder";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const EASE = "cubic-bezier(0.165,0.85,0.45,1)";
const DURATION = 300;
const EXPANDED = "18rem";
const COLLAPSED = "3.3rem";

interface Props {
  allEntries: Entry[];
  roleMap: Record<string, ShareRole>;
  userId: string;
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  sidebarOpen: boolean;
  onToggle: () => void;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  onRefetch: () => void;
  onHome?: () => void;
  onReorder?: (draggedId: string, targetId: string, placement: DropPlacement) => void;
  onMove?: (draggedId: string, parentId: string | null) => void;
}

type DropZone = DropPlacement | "inside";
const ROOT_TARGET = "";

type NavItem = {
  id: string;
  label: string;
  icon: ReactNode;
  shortcut?: string;
  onClick: () => void;
  active?: boolean;
};

function dropZoneAt(event: React.DragEvent<HTMLElement>): DropZone {
  const { top, height } = event.currentTarget.getBoundingClientRect();
  const offset = (event.clientY - top) / height;
  if (offset < 0.25) return "before";
  if (offset > 0.75) return "after";
  return "inside";
}

export const JournalSidebar = memo(function JournalSidebar({
  allEntries,
  roleMap,
  userId,
  activeId,
  onSelect,
  onNew,
  sidebarOpen,
  onToggle,
  collapsed,
  onCollapsedChange,
  onRefetch,
  onHome,
  onReorder,
  onMove,
}: Props) {
  const isMobile = useIsMobile();
  const railCollapsed = !isMobile && collapsed;

  const [dragging, setDragging] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; zone: DropZone } | null>(null);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [trashOpen, setTrashOpen] = useState(false);
  const [trash, setTrash] = useState<Entry[]>([]);
  const [trashLoading, setTrashLoading] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const { user, signOut } = useAuth();

  const isShared = useCallback(
    (e: Entry) => !!roleMap[e.id] && roleMap[e.id] !== "owner",
    [roleMap],
  );

  const owned = allEntries.filter((e) => !isShared(e));
  const pinned = getPinnedEntries(owned);
  const sharedRoots = allEntries.filter((e) => isShared(e) && !e.parent_id);
  const months = groupByMonth(getRootEntries(owned));
  const recentRoots = getRootEntries(owned).slice(0, 8);

  const email = user?.email ?? "";
  const displayName = email.split("@")[0] || "you";
  const initial = displayName[0]?.toUpperCase() ?? "?";

  useEffect(() => {
    if (searching && searchRef.current) searchRef.current.focus();
  }, [searching]);

  useEffect(() => {
    const handler = () => {
      if (railCollapsed) onCollapsedChange(false);
      setSearching(true);
      searchRef.current?.focus();
    };
    window.addEventListener("nw:search", handler);
    return () => window.removeEventListener("nw:search", handler);
  }, [railCollapsed, onCollapsedChange]);

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
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openSearch = () => {
    if (railCollapsed) onCollapsedChange(false);
    setSearching(true);
    requestAnimationFrame(() => searchRef.current?.focus());
  };

  const navItems: NavItem[] = [
    { id: "new", label: "New page", icon: <PlusNavIcon />, shortcut: "⌘N", onClick: onNew },
    { id: "search", label: "Search", icon: <Search className="h-4 w-4" />, shortcut: "⌘/", onClick: openSearch },
    {
      id: "overview",
      label: "Overview",
      icon: <LayoutGrid className="h-4 w-4" />,
      onClick: () => onHome?.(),
      active: activeId == null,
    },
    {
      id: "trash",
      label: "Trash",
      icon: <Trash2 className="h-4 w-4" />,
      onClick: toggleTrash,
      active: trashOpen,
    },
    {
      id: "settings",
      label: "Settings",
      icon: <Settings className="h-4 w-4" />,
      onClick: () => window.dispatchEvent(new CustomEvent("nw:settings")),
    },
  ];

  const q = search.trim().toLowerCase();
  const match = (e: Entry) =>
    getEntryTitle(e).toLowerCase().includes(q) || e.content.toLowerCase().includes(q);

  const filteredMonths = q
    ? months.map((m) => ({ ...m, entries: m.entries.filter(match) })).filter((m) => m.entries.length > 0)
    : months;
  const filteredPinned = q ? pinned.filter(match) : pinned;
  const filteredShared = q ? sharedRoots.filter(match) : sharedRoots;
  const filteredRecent = q ? recentRoots.filter(match) : recentRoots;

  const canDrop = (entry: Entry) =>
    dragging != null && !q && dragging !== entry.id && !isDescendantOf(allEntries, dragging, entry.id);

  const handleDrop = (entry: Entry, zone: DropZone) => {
    if (!dragging || !canDrop(entry)) return;
    if (zone === "inside") onMove?.(dragging, entry.id);
    else onReorder?.(dragging, entry.id, zone);
  };

  const renderEntry = (entry: Entry, depth = 0) => {
    const preview = getEntryTitle(entry);
    const isActive = entry.id === activeId;
    const children = getChildEntries(allEntries, entry.id);
    const hasChildren = children.length > 0;
    const isExpanded = expanded.has(entry.id);
    const drop = dropTarget?.id === entry.id ? dropTarget.zone : null;

    return (
      <li key={entry.id}>
        <div
          className={cn(
            "flex items-center group relative",
            drop === "before" && "before:absolute before:inset-x-0 before:-top-px before:h-0.5 before:bg-accent-strong before:rounded-full",
            drop === "after" && "after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-accent-strong after:rounded-full",
            drop === "inside" && "ring-1 ring-accent-strong/60 rounded-lg",
            dragging === entry.id && "opacity-40",
          )}
          draggable={!isShared(entry) && !q}
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", entry.id);
            setDragging(entry.id);
          }}
          onDragEnd={() => {
            setDragging(null);
            setDropTarget(null);
          }}
          onDragOver={(event) => {
            if (!canDrop(entry)) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
            setDropTarget({ id: entry.id, zone: dropZoneAt(event) });
          }}
          onDragLeave={() => setDropTarget((prev) => (prev?.id === entry.id ? null : prev))}
          onDrop={(event) => {
            event.preventDefault();
            handleDrop(entry, dropZoneAt(event));
            setDropTarget(null);
            setDragging(null);
          }}
        >
          {hasChildren ? (
            <button
              onClick={() => toggleExpand(entry.id)}
              className="p-0.5 text-muted-foreground hover:text-sidebar-foreground transition-colors shrink-0"
              aria-label={isExpanded ? "collapse" : "expand"}
            >
              <ChevronRight className={cn("h-3 w-3 transition-transform", isExpanded && "rotate-90")} />
            </button>
          ) : (
            <span className="w-4 shrink-0" />
          )}
          <EntryRow
            title={preview}
            active={isActive}
            pinned={entry.pinned}
            onClick={() => onSelect(entry.id)}
          />
        </div>
        {hasChildren && isExpanded && !q && (
          <ul className="ml-3 border-l border-sidebar-border space-y-px mt-0.5">
            {children.map((child) => renderEntry(child, depth + 1))}
          </ul>
        )}
      </li>
    );
  };

  const sidebarBody = (
    <SidebarProvider
      defaultOpen
      className="min-h-0! h-full w-fit"
      style={{ "--sidebar-width": EXPANDED } as React.CSSProperties}
    >
      <div
        className="shrink-0 overflow-hidden h-full"
        style={{
          width: isMobile ? EXPANDED : railCollapsed ? COLLAPSED : EXPANDED,
          transition: isMobile ? undefined : `width ${DURATION}ms ${EASE}`,
        }}
      >
        <Sidebar
          collapsible="none"
          className="flex h-full min-h-0 w-full! flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border"
        >
          <SidebarHeader className="relative flex-row! w-full items-center gap-0! p-2! pt-2 h-12 shrink-0">
            <button
              type="button"
              onClick={onHome}
              className="flex items-center gap-1.5 pl-2 h-8 overflow-clip"
              style={{
                transition: `opacity 150ms ${EASE}`,
                opacity: railCollapsed ? 0 : 1,
                pointerEvents: railCollapsed ? "none" : "auto",
              }}
            >
              <Logo size={22} withWordmark wordmarkClassName="text-sm font-display font-semibold" />
            </button>
            {!isMobile && (
              <button
                type="button"
                aria-label={railCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                title={railCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                onClick={() => onCollapsedChange(!collapsed)}
                className="absolute right-2 top-2 z-10 grid size-8 cursor-pointer place-items-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <PanelLeft className="h-[18px] w-[18px]" />
              </button>
            )}
            {isMobile && (
              <button
                type="button"
                aria-label="Close sidebar"
                onClick={onToggle}
                className="absolute right-2 top-2 z-10 grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-sidebar-accent"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </SidebarHeader>

          <SidebarMenu className="gap-px! pt-2 px-2">
            {navItems.map((it) => (
              <SidebarMenuItem key={it.id} className="list-none!">
                <NavRow item={it} collapsed={railCollapsed} />
              </SidebarMenuItem>
            ))}
          </SidebarMenu>

          <SidebarContent
            className="gap-0! pt-2 overflow-x-hidden! flex-1 min-h-0"
            style={{
              transition: `opacity 150ms ${EASE}`,
              opacity: railCollapsed ? 0 : 1,
              pointerEvents: railCollapsed ? "none" : "auto",
            }}
            aria-hidden={railCollapsed}
          >
            <div
              className="px-2 pb-2"
              style={{ display: railCollapsed ? "none" : undefined }}
            >
              <div className="relative mb-3">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <input
                  ref={searchRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onFocus={() => setSearching(true)}
                  placeholder="search pages…"
                  className="w-full rounded-lg border border-sidebar-border bg-background/50 pl-8 pr-8 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setSearch("");
                      setSearching(false);
                      searchRef.current?.blur();
                    }
                  }}
                />
                {(search || searching) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setSearching(false);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {filteredPinned.length > 0 && (
                <SidebarSection title="Pinned">
                  {filteredPinned.map((e) => renderEntry(e))}
                </SidebarSection>
              )}

              {filteredRecent.length > 0 && !q && (
                <SidebarSection title="Recents">
                  {filteredRecent.map((e) => (
                    <li key={e.id}>
                      <EntryRow
                        title={getEntryTitle(e)}
                        active={e.id === activeId}
                        pinned={e.pinned}
                        onClick={() => onSelect(e.id)}
                      />
                    </li>
                  ))}
                </SidebarSection>
              )}

              <div
                className={cn(
                  "mb-4",
                  dropTarget?.id === ROOT_TARGET && "ring-1 ring-accent-strong/60 rounded-lg",
                )}
                onDragOver={(event) => {
                  if (!dragging || q) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  setDropTarget({ id: ROOT_TARGET, zone: "inside" });
                }}
                onDragLeave={() => setDropTarget((prev) => (prev?.id === ROOT_TARGET ? null : prev))}
                onDrop={(event) => {
                  event.preventDefault();
                  setDropTarget(null);
                  if (dragging) onMove?.(dragging, null);
                  setDragging(null);
                }}
              >
                <SidebarSection title="Pages">
                  {filteredMonths.length === 0 ? (
                    <p className="px-2 py-1 text-xs text-muted-foreground">{q ? "no matches" : "no pages yet"}</p>
                  ) : (
                    filteredMonths.map((month) => (
                      <div key={month.key} className="mb-3">
                        <p className="px-2 pb-1 text-[10px] font-medium tracking-wide text-muted-foreground select-none">
                          {month.label}
                        </p>
                        <ul className="flex flex-col gap-px">{month.entries.map((e) => renderEntry(e))}</ul>
                      </div>
                    ))
                  )}
                </SidebarSection>
              </div>

              {filteredShared.length > 0 && (
                <SidebarSection title="Shared with me">
                  {filteredShared.map((e) => renderEntry(e))}
                </SidebarSection>
              )}

              {trashOpen && (
                <SidebarSection title="Trash">
                  {trashLoading ? (
                    <div className="flex items-center gap-2 px-2 py-1.5 text-[11px] text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" /> loading…
                    </div>
                  ) : trash.length === 0 ? (
                    <p className="px-2 py-1.5 text-[11px] text-muted-foreground">trash is empty</p>
                  ) : (
                    trash.map((e) => (
                      <div key={e.id} className="group flex h-8 items-center rounded-lg px-2 text-[13px] hover:bg-sidebar-accent/60">
                        <span className="flex-1 truncate text-sidebar-foreground/80">{getEntryTitle(e)}</span>
                        <button
                          onClick={() => handleRestore(e.id)}
                          className="grid size-7 place-items-center rounded-md text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-sidebar-accent"
                          title="Restore"
                        >
                          <RotateCcw className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handlePurge(e.id)}
                          className="grid size-7 place-items-center rounded-md text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                          title="Delete forever"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))
                  )}
                </SidebarSection>
              )}
            </div>
          </SidebarContent>

          <SidebarFooter className="p-0! gap-0! border-t border-sidebar-border mt-auto shrink-0">
            <div className="group flex h-16 w-full items-center gap-3 px-2 transition-colors duration-150 hover:bg-sidebar-accent/50 overflow-hidden">
              <div className="grid size-9 shrink-0 place-items-center rounded-full bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground">
                {initial}
              </div>
              <div
                className="flex flex-1 flex-col items-start min-w-0"
                style={{
                  transition: `opacity 150ms ${EASE}`,
                  opacity: railCollapsed ? 0 : 1,
                }}
              >
                <span className="truncate text-sm font-medium">{displayName}</span>
                <span className="truncate text-[11px] text-muted-foreground">{email || "signed in"}</span>
              </div>
              <div
                className="flex items-center gap-0.5"
                style={{
                  transition: `opacity 150ms ${EASE}`,
                  opacity: railCollapsed ? 0 : 1,
                  pointerEvents: railCollapsed ? "none" : "auto",
                }}
              >
                {owned.length > 0 && (
                  <button
                    onClick={() => exportAllEntries(owned)}
                    className="grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    title="Export all"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={() => void signOut()}
                  className="grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  title="Sign out"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>
      </div>
    </SidebarProvider>
  );

  if (isMobile) {
    if (!sidebarOpen) return null;
    return (
      <>
        <div onClick={onToggle} className="fixed inset-0 bg-overlay/60 backdrop-blur-sm z-40 md:hidden" />
        <aside className="fixed left-0 top-0 z-50 h-screen max-w-[85vw] shadow-4 md:hidden">{sidebarBody}</aside>
      </>
    );
  }

  return <aside className="relative shrink-0 h-screen">{sidebarBody}</aside>;
});

function NavRow({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  return (
    <button
      type="button"
      onClick={item.onClick}
      aria-label={item.label}
      title={collapsed ? item.label : undefined}
      className={cn(
        "group relative flex h-9 w-full items-center rounded-lg px-4 text-sm transition-colors duration-75 active:scale-[0.99] overflow-hidden",
        item.active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
      )}
    >
      <div className="flex w-full -translate-x-2 items-center gap-3">
        <span className="grid size-5 shrink-0 place-items-center text-sidebar-foreground">{item.icon}</span>
        <span
          className="flex-1 truncate text-left"
          style={{
            transition: `opacity 150ms ${EASE}`,
            opacity: collapsed ? 0 : 1,
          }}
        >
          {item.label}
        </span>
        {item.shortcut && (
          <span
            className="text-[11px] text-muted-foreground opacity-0 transition-opacity duration-75 group-hover:opacity-100"
            style={{ display: collapsed ? "none" : undefined }}
          >
            {item.shortcut}
          </span>
        )}
      </div>
    </button>
  );
}

function SidebarSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-4">
      <h3 className="px-2 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground select-none">{title}</h3>
      <ul className="flex flex-col gap-px">{children}</ul>
    </div>
  );
}

function EntryRow({
  title,
  active,
  pinned,
  onClick,
}: {
  title: string;
  active: boolean;
  pinned: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex h-8 w-full items-center rounded-lg px-3 text-[13px] transition-colors duration-75 overflow-hidden",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
      )}
    >
      <span className="grid size-4 shrink-0 place-items-center mr-2">
        {pinned ? <Pin className="h-3 w-3" /> : <FileText className="h-3 w-3 opacity-60" />}
      </span>
      <span className="flex-1 truncate text-left group-hover:mask-[linear-gradient(to_right,black_78%,transparent_95%)]">
        {title}
      </span>
      <span className="absolute right-1 top-1/2 -translate-y-1/2 grid size-7 place-items-center rounded-md text-muted-foreground opacity-0 transition-opacity duration-150 group-hover:opacity-100 hover:bg-sidebar-accent pointer-events-none">
        <MoreHorizontal className="h-3.5 w-3.5" />
      </span>
    </button>
  );
}

function PlusNavIcon() {
  return (
    <span className="inline-flex size-5 items-center justify-center rounded-full bg-sidebar-foreground/10 transition-transform duration-200 ease-out group-hover:-rotate-3 group-hover:scale-110 group-active:rotate-6 group-active:scale-95">
      <Plus className="h-3 w-3" />
    </span>
  );
}
