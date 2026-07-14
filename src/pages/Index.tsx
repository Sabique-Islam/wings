import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { fetchEntries, createEntry, updateEntry, updateEntryTitle, deleteEntry, togglePin, getBreadcrumbTrail, Entry, getEntryTitle, ShareRole } from "@/lib/journal";
import { saveDraft, getDraft, clearDraft, queuePendingWrite, getPendingWrites, clearPendingWrite } from "@/lib/draftCache";
import { isTypingTarget, isEditorFocused } from "@/lib/keyboard";

import { JournalSidebar } from "@/components/JournalSidebar";
import { JournalEditor } from "@/components/JournalEditor";
import { QuickSwitcher } from "@/components/QuickSwitcher";
import { CommandPalette } from "@/components/CommandPalette";
import { KeyboardPalette } from "@/components/KeyboardPalette";
import { SettingsPanel } from "@/components/SettingsPanel";
import { AIAssistant } from "@/components/AIAssistant";
import { useAuth } from "@/hooks/useAuth";
import { AsciiSpinner } from "@/components/AsciiAnimation";

function resolveEntryOwnerId(
  parentId: string | undefined,
  userId: string,
  entries: Entry[],
  roleMap: Record<string, ShareRole>,
): string {
  if (!parentId) return userId;
  const parent = entries.find((e) => e.id === parentId);
  const role = roleMap[parentId];
  if (parent && role && role !== "owner") return parent.user_id;
  return userId;
}

function entryErrorMessage(err: unknown): string {
  const msg = (err as { message?: string })?.message ?? "";
  if (/jwt|session|auth/i.test(msg)) return "Session expired — sign in again.";
  if (/row-level security|42501/i.test(msg)) return "Permission denied — you may not have access to create this page.";
  if (/network|fetch/i.test(msg)) return "Network error — check your connection.";
  return msg || "Something went wrong. Try again.";
}

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
  const titleDebounceRef = useRef<ReturnType<typeof setTimeout>>();
  const savedFlashRef = useRef<ReturnType<typeof setTimeout>>();
  const creatingRef = useRef(false);

  const setActiveId = useCallback((id: string | null) => {
    setActiveIdRaw(id);
    navigate(id ? `${basePath}/n/${id}` : basePath || "/app");
  }, [navigate, basePath]);

  useEffect(() => {
    setActiveIdRaw(routeId ?? null);
  }, [routeId]);

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
      .catch((err) => {
        console.error("Failed to fetch entries:", err);
        toast.error("Couldn't load pages", { description: entryErrorMessage(err) });
      })
      .finally(() => setLoading(false));
  }, [user]);

  const activeEntry = entries.find((e) => e.id === activeId) ?? null;
  const breadcrumbTrail = activeId ? getBreadcrumbTrail(entries, activeId) : [];

  // Redirect when URL points to a missing/deleted page
  useEffect(() => {
    if (loading || !activeId) return;
    if (activeEntry) return;
    setActiveIdRaw(null);
    navigate(basePath || "/app", { replace: true });
  }, [loading, activeId, activeEntry, basePath, navigate]);

  const addCreatedEntry = useCallback((entry: Entry, ownerId: string) => {
    setEntries((prev) => [entry, ...prev]);
    setRoleMap((prev) => ({
      ...prev,
      [entry.id]: entry.user_id === ownerId ? "owner" : (prev[entry.id] ?? "editor"),
    }));
  }, []);

  const handleNew = useCallback(async () => {
    if (!user || creatingRef.current) return;
    creatingRef.current = true;
    try {
      const entry = await createEntry(user.id, "");
      addCreatedEntry(entry, user.id);
      setActiveId(entry.id);
    } catch (err) {
      console.error("Failed to create page:", err);
      toast.error("Couldn't create page", { description: entryErrorMessage(err) });
    } finally {
      creatingRef.current = false;
    }
  }, [user, setActiveId, addCreatedEntry]);

  const handleNewSubpage = useCallback(async (parentId: string) => {
    if (!user || creatingRef.current) return;
    creatingRef.current = true;
    try {
      const ownerId = resolveEntryOwnerId(parentId, user.id, entries, roleMap);
      const entry = await createEntry(ownerId, "", parentId);
      addCreatedEntry(entry, user.id);
      setActiveId(entry.id);
    } catch (err) {
      console.error("Failed to create sub-page:", err);
      toast.error("Couldn't create sub-page", { description: entryErrorMessage(err) });
    } finally {
      creatingRef.current = false;
    }
  }, [user, entries, roleMap, setActiveId, addCreatedEntry]);

  const handleNewSubpageWithTitle = useCallback(async (parentId: string, title: string) => {
    if (!user || creatingRef.current) return;
    creatingRef.current = true;
    try {
      const ownerId = resolveEntryOwnerId(parentId, user.id, entries, roleMap);
      const entry = await createEntry(ownerId, `# ${title}\n\n`, parentId);
      addCreatedEntry(entry, user.id);
      const editor = (window as { __nw_editor?: { chain: () => { focus: () => { insertContent: (html: string) => { run: () => void } } } } }).__nw_editor;
      if (editor) {
        editor.chain().focus().insertContent(`<a href="#page:${entry.id}">${title}</a>`).run();
      }
    } catch (err) {
      console.error("Failed to create sub-page:", err);
      toast.error("Couldn't create sub-page", { description: entryErrorMessage(err) });
    } finally {
      creatingRef.current = false;
    }
  }, [user, entries, roleMap, addCreatedEntry]);

  const handleEntryCreated = useCallback((entry: Entry) => {
    if (!user) return;
    addCreatedEntry(entry, user.id);
  }, [user, addCreatedEntry]);

  const handleChange = useCallback((content: string) => {
    if (activeId) {
      saveDraft(activeId, content);
    }

    setEntries((prev) => prev.map((e) => (e.id === activeId ? { ...e, content } : e)));

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
          queuePendingWrite(activeId, content);
          setSaveStatus("error");
        }
      }
    }, 500);
  }, [activeId]);

  const handleTitleChange = useCallback((title: string) => {
    if (!activeId) return;
    setEntries((prev) => prev.map((e) => (e.id === activeId ? { ...e, title } : e)));
    if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
    titleDebounceRef.current = setTimeout(async () => {
      if (activeId) {
        try {
          await updateEntryTitle(activeId, title);
        } catch {
          toast.error("Couldn't save title");
        }
      }
    }, 500);
  }, [activeId]);

  useEffect(() => {
    if (!activeId) return;
    const draft = getDraft(activeId);
    if (draft == null) return;
    setEntries((prev) => prev.map((e) => {
      if (e.id !== activeId) return e;
      if (e.content === draft) return e;
      return { ...e, content: draft };
    }));
  }, [activeId]);

  const handleDelete = useCallback(async (id: string) => {
    try {
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
    } catch (err) {
      console.error("Failed to delete page:", err);
      toast.error("Couldn't delete page", { description: entryErrorMessage(err) });
    }
  }, [setActiveId]);

  const handleTogglePin = useCallback(async (id: string, pinned: boolean) => {
    try {
      await togglePin(id, pinned);
      setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, pinned } : e)));
    } catch (err) {
      console.error("Failed to toggle pin:", err);
      toast.error("Couldn't update pin", { description: entryErrorMessage(err) });
    }
  }, []);

  const handleUpdateEntry = useCallback((updated: Entry) => {
    setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (isTypingTarget(e.target) || isEditorFocused()) {
        if (e.key === "n" || e.key === "N") return;
        if (e.key === "b" || e.key === "B") return;
      }
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
    <div className="flex w-full h-screen overflow-hidden min-w-0">
      <JournalSidebar
        allEntries={entries}
        roleMap={roleMap}
        userId={user?.id || ""}
        activeId={activeId}
        onSelect={setActiveId}
        onNew={handleNew}
        sidebarOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onRefetch={() => user && fetchEntries(user.id).then(({ entries: data, roleMap: roles }) => { setEntries(data); setRoleMap(roles); }).catch((err) => toast.error("Couldn't refresh pages", { description: entryErrorMessage(err) }))}
      />
      <JournalEditor
        entry={activeEntry}
        userId={user?.id || ""}
        onChange={handleChange}
        onTitleChange={handleTitleChange}
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
          const editor = (window as { __nw_editor?: { chain: () => { focus: () => { insertContent: (html: string) => { run: () => void } } } } }).__nw_editor;
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
