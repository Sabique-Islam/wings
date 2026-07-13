import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { fetchEntries, createEntry, updateEntry, deleteEntry, togglePin, getBreadcrumbTrail, Entry, getEntryTitle, ShareRole } from "@/lib/journal";
import { saveDraft, getDraft, clearDraft, queuePendingWrite, getPendingWrites, clearPendingWrite } from "@/lib/draftCache";

import { JournalSidebar } from "@/components/JournalSidebar";
import { JournalEditor } from "@/components/JournalEditor";
import { QuickSwitcher } from "@/components/QuickSwitcher";
import { CommandPalette } from "@/components/CommandPalette";
import { KeyboardPalette } from "@/components/KeyboardPalette";
import { SettingsPanel } from "@/components/SettingsPanel";
import { AIAssistant } from "@/components/AIAssistant";
import { useAuth } from "@/hooks/useAuth";
import { AsciiSpinner } from "@/components/AsciiAnimation";

export default function Index() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { id: routeId, username } = useParams<{ id?: string; username?: string }>();
  const basePath = username ? `/${username}` : location.pathname.startsWith("/app") ? "/app" : "";
  const [entries, setEntries] = useState<Entry[]>([]);
  const [roleMap, setRoleMap] = useState<Record<string, ShareRole>>({});
  const [activeId, setActiveIdRaw] = useState<string | null>(routeId ?? null);
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== "undefined" ? window.innerWidth >= 768 : true);
  const [aiOpen, setAiOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const savedFlashRef = useRef<ReturnType<typeof setTimeout>>();

  const setActiveId = useCallback((id: string | null) => {
    setActiveIdRaw(id);
    navigate(id ? `${basePath}/n/${id}` : basePath || "/app");
  }, [navigate, basePath]);

  // Sync state from URL changes (back/forward, deep link)
  useEffect(() => {
    setActiveIdRaw(routeId ?? null);
  }, [routeId]);

  // Flush pending writes on load (retry offline saves)
  useEffect(() => {
    if (!user) return;
    const pending = getPendingWrites();
    pending.forEach(async (pw) => {
      try {
        await updateEntry(pw.entryId, pw.content);
        clearPendingWrite(pw.entryId);
        clearDraft(pw.entryId);
      } catch {
        // Still offline, will retry next load
      }
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchEntries(user.id)
      .then(({ entries: data, roleMap: roles }) => {
        setEntries(data);
        setRoleMap(roles);
      })
      .catch((err) => console.error("Failed to fetch entries:", err))
      .finally(() => setLoading(false));
  }, [user]);

  const activeEntry = entries.find((e) => e.id === activeId) ?? null;
  const breadcrumbTrail = activeId ? getBreadcrumbTrail(entries, activeId) : [];

  const handleNew = useCallback(async () => {
    if (!user) return;
    const entry = await createEntry(user.id, "");
    setEntries((prev) => [entry, ...prev]);
    setActiveId(entry.id);
  }, [user]);

  const handleNewSubpage = useCallback(async (parentId: string) => {
    if (!user) return;
    const entry = await createEntry(user.id, "", parentId);
    setEntries((prev) => [entry, ...prev]);
    setActiveId(entry.id);
  }, [user]);

  const handleNewSubpageWithTitle = useCallback(async (parentId: string, title: string) => {
    if (!user) return;
    const entry = await createEntry(user.id, `# ${title}\n\n`, parentId);
    setEntries((prev) => [entry, ...prev]);
    // Insert a link to the new page at the cursor in the parent's editor
    const editor = (window as any).__nw_editor;
    if (editor) {
      editor.chain().focus().insertContent(`<a href="#page:${entry.id}">${title}</a>`).run();
    }
  }, [user]);

  const handleEntryCreated = useCallback((entry: Entry) => {
    setEntries((prev) => [entry, ...prev]);
  }, []);

  const handleChange = useCallback((content: string) => {
    // Local-first: persist to localStorage SYNCHRONOUSLY before anything else
    // so a crash, reload, or network error can never lose a keystroke.
    if (activeId) {
      saveDraft(activeId, content);
    }

    setEntries((prev) => prev.map((e) => {
      if (e.id !== activeId) return e;
      const title = content.split("\n")[0].replace(/^#+\s*/, "").slice(0, 100);
      return { ...e, content, title };
    }));

    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSaveStatus("saving");
    debounceRef.current = setTimeout(async () => {
      if (activeId) {
        try {
          await updateEntry(activeId, content);
          clearDraft(activeId);
          clearPendingWrite(activeId);
          setSaveStatus("saved");
          if (savedFlashRef.current) clearTimeout(savedFlashRef.current);
          savedFlashRef.current = setTimeout(() => setSaveStatus("idle"), 1500);
        } catch {
          // Network error — queue for retry; draft remains in localStorage.
          queuePendingWrite(activeId, content);
          setSaveStatus("error");
        }
      }
    }, 500);
  }, [activeId]);

  // When opening an entry, prefer the local draft if it diverges from the
  // server copy — this restores anything the user typed while offline or
  // before the page was reloaded.
  useEffect(() => {
    if (!activeId) return;
    const draft = getDraft(activeId);
    if (draft == null) return;
    setEntries((prev) => prev.map((e) => {
      if (e.id !== activeId) return e;
      if (e.content === draft) return e;
      const title = draft.split("\n")[0].replace(/^#+\s*/, "").slice(0, 100);
      return { ...e, content: draft, title };
    }));
  }, [activeId]);


  const handleDelete = useCallback(async (id: string) => {
    await deleteEntry(id);
    setEntries((prev) => {
      const idsToRemove = new Set<string>();
      const collect = (pid: string) => {
        idsToRemove.add(pid);
        prev.filter((e) => e.parent_id === pid).forEach((e) => collect(e.id));
      };
      collect(id);
      return prev.filter((e) => !idsToRemove.has(e.id));
    });
    setActiveId(null);
  }, []);

  const handleTogglePin = useCallback(async (id: string, pinned: boolean) => {
    await togglePin(id, pinned);
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, pinned } : e)));
  }, []);

  const handleUpdateEntry = useCallback((updated: Entry) => {
    setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key === "n" || e.key === "N") { e.preventDefault(); handleNew(); }
      if (e.key === "b" || e.key === "B") { e.preventDefault(); setSidebarOpen((s) => !s); }
      if (e.key === "/") { e.preventDefault(); setSidebarOpen(true); window.dispatchEvent(new CustomEvent("nw:search")); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleNew]);

  useEffect(() => {
    const handler = (e: Event) => {
      const pageId = (e as CustomEvent).detail;
      if (pageId) setActiveId(pageId);
    };
    window.addEventListener("nw:navigate", handler);
    return () => window.removeEventListener("nw:navigate", handler);
  }, [setActiveId]);

  useEffect(() => {
    const open = () => setAiOpen(true);
    window.addEventListener("nw:openAI", open);
    return () => window.removeEventListener("nw:openAI", open);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "j") {
        e.preventDefault();
        setAiOpen((s) => !s);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <AsciiSpinner />
      </div>
    );
  }

  return (
    <div className="flex w-full h-screen overflow-hidden">
      <JournalSidebar
        allEntries={entries}
        roleMap={roleMap}
        userId={user?.id || ""}
        activeId={activeId}
        onSelect={setActiveId}
        onNew={handleNew}
        sidebarOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onRefetch={() => user && fetchEntries(user.id).then(({ entries: data, roleMap: roles }) => { setEntries(data); setRoleMap(roles); })}
      />
      <JournalEditor
        entry={activeEntry}
        userId={user?.id || ""}
        onChange={handleChange}
        onDelete={handleDelete}
        onTogglePin={handleTogglePin}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        breadcrumbTrail={breadcrumbTrail}
        onNavigate={setActiveId}
        onNewSubpage={handleNewSubpage}
        onUpdateEntry={handleUpdateEntry}
        userRole={activeId ? (roleMap[activeId] || "owner") : "owner"}
        onNewSubpageWithTitle={handleNewSubpageWithTitle}
        onOpenAI={() => setAiOpen(true)}
        onImported={() => user && fetchEntries(user.id).then(({ entries: data, roleMap: roles }) => { setEntries(data); setRoleMap(roles); })}
        saveStatus={saveStatus}
      />
      <QuickSwitcher
        entries={entries}
        onSelect={setActiveId}
        onLinkPage={(entry) => {
          const title = getEntryTitle(entry);
          const editor = (window as any).__nw_editor;
          if (editor) {
            editor.chain().focus().insertContent(`<a href="#page:${entry.id}">${title}</a>`).run();
          }
        }}
      />
      <CommandPalette
        entries={entries}
        onSelect={setActiveId}
        onNew={handleNew}
        onToggleSidebar={() => setSidebarOpen((s) => !s)}
      />
      <KeyboardPalette />
      <SettingsPanel />
      <AIAssistant
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        activeEntry={activeEntry}
        allEntries={entries}
        onCreateEntry={handleEntryCreated}
        onNavigate={setActiveId}
      />
    </div>
  );
}
