import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { fetchEntries, createEntry, updateEntry, updateEntryTitle, deleteEntry, togglePin, getBreadcrumbTrail, Entry, getEntryTitle, ShareRole, entryHasShares } from "@/lib/journal";
import { saveDraft, saveDraftThrottled, getDraft, clearDraft, queuePendingWrite, getPendingWrites, clearPendingWrite, hydrateDraftCache } from "@/lib/draftCache";
import { readCachedEntries, readWorkspaceMeta, replaceCachedEntries, putCachedEntry, putWorkspaceMeta } from "@/lib/localStore";
import { forgetLinkIndex, hydrateLinkIndex, scheduleLinkIndex } from "@/lib/linkIndex";
import { appendMarkdown, payloadFromMarkdown } from "@/lib/entryContent";
import { deleteBlocksAtPositions } from "@/components/BlockEditor/blockUtils";
import { isFullPayload, requestEditorSerialize, type EditorChangePayload } from "@/lib/editorPayload";
import { resolveInitialEditorContent, shouldApplyDraft, shouldBlockEmptySave, shouldReplayPendingWrite } from "@/lib/editorContent";
import { getEntryVersion, recordEntryVersion } from "@/lib/entryVersions";
import { isTypingTarget, isEditorFocused } from "@/lib/keyboard";

import { JournalSidebar } from "@/components/JournalSidebar";
import { JournalEditor } from "@/components/JournalEditor";
import { QuickSwitcher } from "@/components/QuickSwitcher";
import { CommandPalette } from "@/components/CommandPalette";
import { KeyboardPalette } from "@/components/KeyboardPalette";
import { GraphView } from "@/components/GraphView";
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

/** Insert a link to `entryId` at the editor's cursor, if an editor is mounted. */
function insertPageLink(entryId: string, title: string): void {
  const editor = (window as {
    __nw_editor?: { chain: () => { focus: () => { insertContent: (html: string) => { run: () => void } } } };
  }).__nw_editor;
  editor?.chain().focus().insertContent(`<a href="#page:${entryId}">${title}</a>`).run();
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
  const userId = user?.id;
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
  // Distinct from `loading`: the cached paint clears `loading` early, but a
  // page missing from the mirror is not yet proof the page is gone.
  const [serverSynced, setServerSynced] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const titleDebounceRef = useRef<ReturnType<typeof setTimeout>>();
  const savedFlashRef = useRef<ReturnType<typeof setTimeout>>();
  const creatingRef = useRef(false);
  const pendingPayloadRef = useRef<EditorChangePayload | null>(null);
  const [sharedEntryIds, setSharedEntryIds] = useState<Set<string>>(() => new Set());
  const SAVE_DEBOUNCE_MS = 1500;
  // Read by debounced save work so the callbacks feeding the editor keep a
  // stable identity across the state updates each save produces.
  const entriesRef = useRef(entries);
  entriesRef.current = entries;

  const setActiveId = useCallback((id: string | null) => {
    setActiveIdRaw(id);
    navigate(id ? `${basePath}/n/${id}` : basePath || "/app");
  }, [navigate, basePath]);

  useEffect(() => {
    setActiveIdRaw(routeId ?? null);
  }, [routeId]);

  useEffect(() => {
    if (!user || loading) return;
    void (async () => {
      const pending = await getPendingWrites();
      if (!pending.length) return;
      for (const pw of pending) {
        const server = entriesRef.current.find((e) => e.id === pw.entryId);
        const serverContent = server?.content ?? "";
        if (!shouldReplayPendingWrite(serverContent, pw.content)) {
          clearPendingWrite(pw.entryId);
          clearDraft(pw.entryId);
          continue;
        }
        try {
          await updateEntry(pw.entryId, {
            markdown: pw.content,
            json: pw.contentJson ?? { type: "doc", content: [] },
          });
          clearPendingWrite(pw.entryId);
          clearDraft(pw.entryId);
        } catch {
          // Still offline, will retry next load
        }
      }
    })();
  }, [user, loading]);

  const loadEntries = useCallback(async () => {
    if (!user) return;
    const { entries: data, roleMap: roles, sharedEntryIds: shared } = await fetchEntries(user.id);
    setEntries(data);
    setRoleMap(roles);
    setSharedEntryIds(shared);
  }, [user]);

  // Paint from the IndexedDB mirror before the network answers, then reconcile.
  // Share state comes from the same snapshot so the editor knows whether to
  // mount collaboratively without waiting on Supabase.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      await Promise.all([hydrateDraftCache(), hydrateLinkIndex()]);
      const [cached, meta] = await Promise.all([
        readCachedEntries(user.id),
        readWorkspaceMeta(user.id),
      ]);
      if (cancelled) return;
      if (cached.length > 0 && meta) {
        setEntries(cached);
        setRoleMap(meta.roleMap);
        setSharedEntryIds(new Set(meta.sharedEntryIds));
        setLoading(false);
      }
      try {
        await loadEntries();
      } catch (err) {
        console.error("Failed to fetch entries:", err);
        toast.error("Couldn't load pages", { description: entryErrorMessage(err) });
      } finally {
        if (!cancelled) {
          setLoading(false);
          setServerSynced(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, loadEntries]);

  // Refresh the mirror off the typing path so the next open is instant.
  useEffect(() => {
    if (!user || loading || entries.length === 0) return;
    const timer = setTimeout(() => {
      void replaceCachedEntries(user.id, entries);
      void putWorkspaceMeta({
        userId: user.id,
        roleMap,
        sharedEntryIds: Array.from(sharedEntryIds),
        fetchedAt: Date.now(),
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [user, loading, entries, roleMap, sharedEntryIds]);

  const activeEntry = entries.find((e) => e.id === activeId) ?? null;
  const breadcrumbTrail = activeId ? getBreadcrumbTrail(entries, activeId) : [];
  // Known before the editor mounts: TipTap cannot switch into collaborative
  // mode later without throwing away the editor the user is typing in.
  const collabEnabled =
    Boolean(activeId && sharedEntryIds.has(activeId)) && Boolean(import.meta.env.VITE_COLLAB_URL);

  // Redirect when URL points to a missing/deleted page
  useEffect(() => {
    if (!serverSynced || !activeId) return;
    if (activeEntry) return;
    setActiveIdRaw(null);
    navigate(basePath || "/app", { replace: true });
  }, [serverSynced, activeId, activeEntry, basePath, navigate]);

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
      insertPageLink(entry.id, title);
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

  const handleChange = useCallback((entryId: string, payload: EditorChangePayload) => {
    saveDraftThrottled(entryId, { markdown: payload.markdown, json: payload.json });
    scheduleLinkIndex(entryId, payload.json);
    // Stale serialize from a note we already left — draft only, no autosave / pending ref.
    if (entryId !== activeId) return;

    pendingPayloadRef.current = payload;

    // While Yjs collab is live, Hocuspocus owns persistence — skip full-doc UPDATE.
    if (collabEnabled) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (!activeId) return;
      // Typing emits JSON only, so ask the editor for markdown now — `content`
      // and `content_json` must come from one serialize of one document.
      const pending = pendingPayloadRef.current;
      const toSave = requestEditorSerialize(activeId) ?? (isFullPayload(pending) ? pending : null);
      if (!toSave) return;
      pendingPayloadRef.current = toSave;
      const existing = entriesRef.current.find((e) => e.id === activeId);
      if (existing && shouldBlockEmptySave(existing.content, toSave.markdown)) {
        console.warn("[wings] blocked empty autosave over existing content");
        return;
      }
      setSaveStatus("saving");
      // Durable locally before the network is attempted, so a refresh while the
      // request is in flight still shows what was typed.
      if (userId && existing) {
        void putCachedEntry(userId, { ...existing, content: toSave.markdown, content_json: toSave.json });
      }
      try {
        await updateEntry(activeId, toSave);
        setEntries((prev) =>
          prev.map((e) =>
            e.id === activeId
              ? { ...e, content: toSave.markdown, content_json: toSave.json }
              : e,
          ),
        );
        clearDraft(activeId);
        clearPendingWrite(activeId);
        void recordEntryVersion(activeId, userId ?? null, {
          content: toSave.markdown,
          content_json: toSave.json,
        });
        setSaveStatus("saved");
        if (savedFlashRef.current) clearTimeout(savedFlashRef.current);
        savedFlashRef.current = setTimeout(() => setSaveStatus("idle"), 1500);
      } catch {
        queuePendingWrite(activeId, { markdown: toSave.markdown, json: toSave.json });
        setSaveStatus("error");
      }
    }, SAVE_DEBOUNCE_MS);
  }, [activeId, collabEnabled, userId]);

  // Turn selected blocks into a sub-page. The editor has already removed them
  // and left the cursor where they were, so the link lands in their place.
  useEffect(() => {
    const handler = (event: Event) => {
      const { title, markdown } = (event as CustomEvent<{ title: string; markdown: string }>).detail;
      if (!user || !activeId) return;
      void (async () => {
        try {
          const ownerId = resolveEntryOwnerId(activeId, user.id, entriesRef.current, roleMap);
          const entry = await createEntry(ownerId, markdown, activeId);
          addCreatedEntry(entry, user.id);
          insertPageLink(entry.id, title);
          toast.success(`Moved into “${title}”`);
        } catch (err) {
          console.error("Failed to turn blocks into a page:", err);
          toast.error("Couldn't create the page", { description: entryErrorMessage(err) });
        }
      })();
    };
    window.addEventListener("nw:turnIntoPage", handler);
    return () => window.removeEventListener("nw:turnIntoPage", handler);
  }, [user, activeId, roleMap, addCreatedEntry]);

  // The action menu stashes what it wants moved; the page picker supplies where.
  const pendingBlockMoveRef = useRef<{ markdown: string; positions: number[] } | null>(null);
  useEffect(() => {
    const handler = (event: Event) => {
      pendingBlockMoveRef.current = (
        event as CustomEvent<{ markdown: string; positions: number[] }>
      ).detail;
    };
    window.addEventListener("nw:moveBlocksToPage", handler);
    return () => window.removeEventListener("nw:moveBlocksToPage", handler);
  }, []);

  const handleMoveBlocksToPage = useCallback(async (target: Entry) => {
    const move = pendingBlockMoveRef.current;
    pendingBlockMoveRef.current = null;
    if (!move) return;
    const nextMarkdown = appendMarkdown(target.content, move.markdown);
    // Appending can only grow the page, so anything shorter means the extraction
    // went wrong and this write would destroy the destination.
    if (shouldBlockEmptySave(target.content, nextMarkdown)) {
      console.warn("[wings] blocked empty block move over existing content");
      toast.error("Couldn't move those blocks");
      return;
    }
    const payload = payloadFromMarkdown(nextMarkdown);
    try {
      await updateEntry(target.id, payload);
      setEntries((prev) =>
        prev.map((e) =>
          e.id === target.id ? { ...e, content: payload.markdown, content_json: payload.json } : e,
        ),
      );
      if (userId) {
        void putCachedEntry(userId, {
          ...target,
          content: payload.markdown,
          content_json: payload.json,
        });
      }
      // Only now is it safe to drop them from the page they came from.
      const editor = (window as { __nw_editor?: Parameters<typeof deleteBlocksAtPositions>[0] }).__nw_editor;
      if (editor) deleteBlocksAtPositions(editor, move.positions);
      toast.success(`Moved to “${getEntryTitle(target)}”`);
    } catch (err) {
      console.error("Failed to move blocks:", err);
      toast.error("Couldn't move those blocks", { description: entryErrorMessage(err) });
    }
  }, [userId]);

  const handleRestoreVersion = useCallback(async (entryId: string, versionId: string) => {
    const current = entriesRef.current.find((e) => e.id === entryId);
    if (!current) return;
    try {
      const snapshot = await getEntryVersion(versionId);
      if (!snapshot) {
        toast.error("That version is no longer available");
        return;
      }
      if (shouldBlockEmptySave(current.content, snapshot.content)) {
        toast.error("That snapshot is empty — restoring it would clear the page");
        return;
      }
      const payload = snapshot.content_json
        ? { markdown: snapshot.content, json: snapshot.content_json }
        : payloadFromMarkdown(snapshot.content);
      await updateEntry(entryId, payload);
      // A draft from before the restore would immediately overwrite it.
      clearDraft(entryId);
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entryId ? { ...e, content: payload.markdown, content_json: payload.json } : e,
        ),
      );
      if (userId) {
        void putCachedEntry(userId, {
          ...current,
          content: payload.markdown,
          content_json: payload.json,
        });
      }
      const editor = (window as { __nw_editor?: Parameters<typeof deleteBlocksAtPositions>[0] })
        .__nw_editor;
      if (entryId === activeId && editor) {
        editor.commands.setContent(resolveInitialEditorContent(payload.markdown, payload.json));
      }
      toast.success("Restored earlier version");
    } catch (err) {
      console.error("Failed to restore version:", err);
      toast.error("Couldn't restore that version", { description: entryErrorMessage(err) });
    }
  }, [activeId, userId]);

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

  // Runs again once loading clears: on a cold start the entries list is still
  // empty when `activeId` first arrives, so a draft written just before the tab
  // closed would otherwise never be restored.
  useEffect(() => {
    if (!activeId || loading) return;
    const draft = getDraft(activeId);
    if (draft == null) return;
    setEntries((prev) => prev.map((e) => {
      if (e.id !== activeId) return e;
      if (!shouldApplyDraft(e.content, draft.markdown, draft.json)) return e;
      if (e.content === draft.markdown && e.content_json === draft.json) return e;
      // A JSON-only draft has no markdown to restore — keep the server copy so
      // the empty-save guard still measures against the real content length.
      const content = draft.markdown.trim().length > 0 ? draft.markdown : e.content;
      return { ...e, content, content_json: draft.json ?? e.content_json };
    }));
  }, [activeId, loading]);

  useEffect(() => {
    const onSharesChanged = async (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (!id) return;
      const shared = await entryHasShares(id);
      setSharedEntryIds((prev) => {
        if (prev.has(id) === shared) return prev;
        const next = new Set(prev);
        if (shared) next.add(id);
        else next.delete(id);
        return next;
      });
    };
    window.addEventListener("nw:shares-changed", onSharesChanged);
    return () => window.removeEventListener("nw:shares-changed", onSharesChanged);
  }, []);

  const flushEditor = useCallback(() => {
    if (!activeId) return;
    const payload = requestEditorSerialize(activeId);
    if (!payload) return;
    pendingPayloadRef.current = payload;
    saveDraft(activeId, payload);
  }, [activeId]);

  /** On page switch, persist draft for the note we're leaving. */
  const flushDraftForEntry = useCallback((entryId: string) => {
    if (entryId !== activeId) return;
    // Its editor is still mounted at this point, so take a full serialize
    // rather than the JSON-only payload the typing path leaves behind.
    const payload = requestEditorSerialize(entryId) ?? pendingPayloadRef.current;
    if (payload) saveDraft(entryId, payload);
  }, [activeId]);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") flushEditor();
    };
    window.addEventListener("visibilitychange", onHide);
    window.addEventListener("beforeunload", flushEditor);
    return () => {
      window.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("beforeunload", flushEditor);
    };
  }, [flushEditor]);

  useEffect(() => {
    const leavingId = activeId;
    return () => {
      if (leavingId) flushDraftForEntry(leavingId);
    };
  }, [activeId, flushDraftForEntry]);

  useEffect(() => {
    const onCollabFlush = async () => {
      if (!activeId) return;
      flushEditor();
      const toSave = pendingPayloadRef.current;
      if (!isFullPayload(toSave)) return;
      const existing = entriesRef.current.find((e) => e.id === activeId);
      if (existing && shouldBlockEmptySave(existing.content, toSave.markdown)) {
        console.warn("[wings] blocked empty collab flush over existing content");
        return;
      }
      try {
        await updateEntry(activeId, toSave);
        clearDraft(activeId);
        void recordEntryVersion(activeId, userId ?? null, {
          content: toSave.markdown,
          content_json: toSave.json,
        });
      } catch {
        queuePendingWrite(activeId, { markdown: toSave.markdown, json: toSave.json });
      }
    };
    window.addEventListener("nw:collab-flush", onCollabFlush);
    return () => window.removeEventListener("nw:collab-flush", onCollabFlush);
  }, [activeId, flushEditor, userId]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteEntry(id);
      const removed = new Set<string>();
      const collect = (pid: string) => {
        removed.add(pid);
        entriesRef.current.filter((e) => e.parent_id === pid).forEach((e) => collect(e.id));
      };
      collect(id);
      removed.forEach(forgetLinkIndex);
      setEntries((prev) => prev.filter((e) => !removed.has(e.id)));
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

  const openAI = useCallback(() => setAiOpen(true), []);
  const toggleSidebar = useCallback(() => setSidebarOpen((s) => !s), []);

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
        onRefetch={() => void loadEntries().catch((err) => toast.error("Couldn't refresh pages", { description: entryErrorMessage(err) }))}
        onHome={() => setActiveId(null)}
      />
      <JournalEditor
        entry={activeEntry}
        allEntries={entries}
        roleMap={roleMap}
        userId={user?.id || ""}
        onChange={handleChange}
        onTitleChange={handleTitleChange}
        onDelete={handleDelete}
        onTogglePin={handleTogglePin}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={toggleSidebar}
        breadcrumbTrail={breadcrumbTrail}
        onNavigate={setActiveId}
        onNewSubpage={handleNewSubpage}
        onUpdateEntry={handleUpdateEntry}
        userRole={activeId ? (roleMap[activeId] || "owner") : "owner"}
        onNewSubpageWithTitle={handleNewSubpageWithTitle}
        onRestoreVersion={handleRestoreVersion}
        onOpenAI={openAI}
        onNew={handleNew}
        onImported={() => void loadEntries()}
        saveStatus={saveStatus}
        collabEnabled={collabEnabled}
      />
      <QuickSwitcher
        entries={entries}
        onSelect={setActiveId}
        onLinkPage={(entry) => insertPageLink(entry.id, getEntryTitle(entry))}
        onMoveBlocks={handleMoveBlocksToPage}
      />
      <CommandPalette
        entries={entries}
        onSelect={setActiveId}
        onNew={handleNew}
        onToggleSidebar={() => setSidebarOpen((s) => !s)}
      />
      <KeyboardPalette />
      <GraphView entries={entries} activeId={activeId} onNavigate={setActiveId} />
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
