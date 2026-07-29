import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, FolderOpen, RefreshCw, Unplug, Upload, FileDown } from "lucide-react";
import { toast } from "sonner";
import { putVaultMeta, type VaultMetaRow } from "@/lib/localStore";
import { fetchEntries, type Entry } from "@/lib/journal";
import { isVaultSupported, type VaultConflict } from "@/lib/vault/types";
import { connectVault, disconnectVault, ensureVaultPermission, getVaultMeta } from "@/lib/vault/store";
import { resolveVaultConflict, syncFromVault } from "@/lib/vault/sync";
import { writeAllEntriesToVault } from "@/lib/vault/write";
import { importNotionFiles } from "@/lib/notionImport";

/** Tell the app what the folder changed so the sidebar and index stay current. */
function publishEntries(entries: Entry[]): void {
  window.dispatchEvent(new CustomEvent("nw:vault-synced", { detail: entries }));
}

export function VaultSettings({ userId }: { userId: string | null }) {
  const [meta, setMeta] = useState<VaultMetaRow | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<VaultConflict[]>([]);
  const notionInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setMeta(await getVaultMeta(userId));
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleConnect = async () => {
    if (!userId) return;
    setBusy("connect");
    try {
      const row = await connectVault(userId);
      if (!row) {
        toast.error("Couldn't connect vault folder");
        return;
      }
      setMeta(row);
      toast.success(`Connected to “${row.folderName}”`);
    } catch (err) {
      console.error(err);
      toast.error("Vault connection cancelled or failed");
    } finally {
      setBusy(null);
    }
  };

  const handleDisconnect = async () => {
    if (!userId) return;
    await disconnectVault(userId);
    setMeta(null);
    setConflicts([]);
    toast.success("Vault disconnected");
  };

  const handleSync = async () => {
    if (!userId || !meta?.handle) return;
    setBusy("sync");
    try {
      if (!(await ensureVaultPermission(meta))) {
        toast.error("Vault folder permission denied");
        return;
      }
      // Read from the server rather than the local mirror: the mirror lags a
      // second behind typing, and comparing against stale content is what makes
      // a sync overwrite work the user just did.
      const { entries } = await fetchEntries(userId);
      const { result } = await syncFromVault(userId, meta.handle, entries, meta, publishEntries);
      setConflicts(result.conflicts);
      await refresh();
      const summary = `${result.created} created · ${result.updated} updated`;
      if (result.conflicts.length > 0) {
        toast.warning(`Sync finished with ${result.conflicts.length} conflicts`, {
          description: `${summary} · resolve the conflicts below`,
        });
      } else {
        toast.success(`Sync complete · ${summary}`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Vault sync failed");
    } finally {
      setBusy(null);
    }
  };

  const handleResolve = async (conflict: VaultConflict, winner: "page" | "file") => {
    if (!userId || !meta?.handle) return;
    setBusy(conflict.entryId);
    try {
      const { entries } = await fetchEntries(userId);
      const resolved = await resolveVaultConflict(meta.handle, conflict, winner, entries, meta);
      publishEntries(resolved.entries);
      setMeta(resolved.meta);
      setConflicts((current) => current.filter((c) => c.entryId !== conflict.entryId));
      toast.success(winner === "page" ? "Folder updated from Wings" : "Page updated from the folder");
    } catch (err) {
      console.error(err);
      toast.error("Couldn't resolve the conflict");
    } finally {
      setBusy(null);
    }
  };

  const handleWriteAll = async () => {
    if (!userId || !meta?.handle) return;
    setBusy("write");
    try {
      if (!(await ensureVaultPermission(meta))) {
        toast.error("Vault folder permission denied");
        return;
      }
      const { entries } = await fetchEntries(userId);
      const next = await writeAllEntriesToVault(meta.handle, entries, meta);
      setMeta(next);
      toast.success(`Wrote ${entries.length} pages to vault`);
    } catch (err) {
      console.error(err);
      toast.error("Couldn't write pages to vault");
    } finally {
      setBusy(null);
    }
  };

  const handleNotionImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!userId) return;
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    setBusy("notion");
    try {
      const created = await importNotionFiles(files, userId);
      const { entries } = await fetchEntries(userId);
      publishEntries(entries);
      toast.success(`Imported ${created.length} page${created.length === 1 ? "" : "s"} from Notion`);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Notion import failed");
    } finally {
      setBusy(null);
    }
  };

  const handleDismissError = async () => {
    if (!meta) return;
    const cleared = { ...meta, lastError: null };
    await putVaultMeta(cleared);
    setMeta(cleared);
  };

  if (!isVaultSupported()) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-ink-1 font-sans">
          Export happens per-page from the editor toolbar, or export everything from the sidebar.
        </p>
        <div className="rounded-lg border border-border-subtle p-3 text-xs font-mono text-ink-2">
          Vault folder sync requires Chrome or Edge. Use export/import here or in the editor on this browser.
        </div>
        <button
          type="button"
          disabled={!userId || busy != null}
          onClick={() => notionInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded border border-border px-3 py-1.5 text-xs font-mono hover:bg-accent-soft/40 disabled:opacity-50"
        >
          <FileDown className="h-3.5 w-3.5" />
          {busy === "notion" ? "importing…" : "import from Notion"}
        </button>
        <input
          ref={notionInputRef}
          type="file"
          className="hidden"
          accept=".md,.markdown,.csv,text/markdown,text/csv"
          multiple
          onChange={(e) => void handleNotionImport(e)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-1 font-sans">
        Connect a local folder to mirror pages as <span className="font-mono">.md</span> files. Wings stays
        authoritative — sync pulls only when files are newer.
      </p>
      {meta?.handle ? (
        <div className="rounded-lg border border-border-subtle p-3 space-y-3">
          <div className="flex items-center gap-2 text-sm font-mono">
            <FolderOpen className="h-4 w-4" />
            <span>{meta.folderName}</span>
          </div>
          {meta.lastError && (
            <div className="rounded border border-destructive/40 bg-destructive/10 p-2.5 space-y-1.5">
              <div className="flex items-start gap-2 text-xs font-mono text-destructive">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>Pages stopped mirroring to this folder: {meta.lastError.message}</span>
              </div>
              <button
                type="button"
                onClick={() => void handleDismissError()}
                className="text-xs font-mono underline text-ink-2 hover:text-ink-1"
              >
                dismiss
              </button>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy != null}
              onClick={() => void handleSync()}
              className="inline-flex items-center gap-1.5 rounded border border-border px-3 py-1.5 text-xs font-mono hover:bg-accent-soft/40 disabled:opacity-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {busy === "sync" ? "syncing…" : "sync from folder"}
            </button>
            <button
              type="button"
              disabled={busy != null}
              onClick={() => void handleWriteAll()}
              className="inline-flex items-center gap-1.5 rounded border border-border px-3 py-1.5 text-xs font-mono hover:bg-accent-soft/40 disabled:opacity-50"
            >
              <Upload className="h-3.5 w-3.5" />
              {busy === "write" ? "writing…" : "write all pages"}
            </button>
            <button
              type="button"
              disabled={busy != null}
              onClick={() => void handleDisconnect()}
              className="inline-flex items-center gap-1.5 rounded border border-border px-3 py-1.5 text-xs font-mono text-destructive hover:bg-destructive/10 disabled:opacity-50"
            >
              <Unplug className="h-3.5 w-3.5" />
              disconnect
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={!userId || busy != null}
          onClick={() => void handleConnect()}
          className="inline-flex items-center gap-2 rounded bg-accent-strong text-accent-strong-foreground text-xs font-mono px-4 py-2 hover:bg-accent-strong-hover disabled:opacity-50"
        >
          <FolderOpen className="h-3.5 w-3.5" />
          {busy === "connect" ? "connecting…" : "connect vault folder"}
        </button>
      )}

      {conflicts.length > 0 && (
        <div className="rounded-lg border border-border-subtle p-3 space-y-3">
          <p className="text-xs font-mono text-ink-2">
            These pages changed in Wings and in the folder. Nothing was overwritten — pick which version to keep.
          </p>
          {conflicts.map((conflict) => (
            <div key={conflict.entryId} className="rounded border border-border-subtle p-2.5 space-y-2">
              <div className="text-sm font-mono truncate">{conflict.title}</div>
              <div className="text-xs font-mono text-ink-3 truncate">{conflict.relativePath}</div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy != null}
                  onClick={() => void handleResolve(conflict, "page")}
                  className="rounded border border-border px-2.5 py-1 text-xs font-mono hover:bg-accent-soft/40 disabled:opacity-50"
                >
                  keep Wings version
                </button>
                <button
                  type="button"
                  disabled={busy != null}
                  onClick={() => void handleResolve(conflict, "file")}
                  className="rounded border border-border px-2.5 py-1 text-xs font-mono hover:bg-accent-soft/40 disabled:opacity-50"
                >
                  keep folder version
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-border-subtle p-3 space-y-2">
        <p className="text-sm text-ink-1 font-sans">
          Import a Notion export (Markdown &amp; CSV). Pick the unzipped folder or select the
          exported <span className="font-mono">.md</span> / <span className="font-mono">.csv</span>{" "}
          files.
        </p>
        <button
          type="button"
          disabled={!userId || busy != null}
          onClick={() => notionInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded border border-border px-3 py-1.5 text-xs font-mono hover:bg-accent-soft/40 disabled:opacity-50"
        >
          <FileDown className="h-3.5 w-3.5" />
          {busy === "notion" ? "importing…" : "import from Notion"}
        </button>
        <input
          ref={notionInputRef}
          type="file"
          className="hidden"
          accept=".md,.markdown,.csv,text/markdown,text/csv"
          multiple
          onChange={(e) => void handleNotionImport(e)}
        />
      </div>

      <div className="rounded-lg border border-border-subtle p-3 text-xs font-mono text-ink-2">
        export formats: markdown (.md), json (.json) · saves mirror to the connected folder automatically
      </div>
    </div>
  );
}
