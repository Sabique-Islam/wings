import { useCallback, useEffect, useState } from "react";
import { FolderOpen, RefreshCw, Unplug, Upload } from "lucide-react";
import { toast } from "sonner";
import { readCachedEntries, type VaultMetaRow } from "@/lib/localStore";
import { isVaultSupported } from "@/lib/vault/types";
import { connectVault, disconnectVault, ensureVaultPermission, getVaultMeta } from "@/lib/vault/store";
import { syncFromVault } from "@/lib/vault/sync";
import { writeAllEntriesToVault } from "@/lib/vault/write";

export function VaultSettings({ userId }: { userId: string | null }) {
  const [meta, setMeta] = useState<VaultMetaRow | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

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
      const entries = await readCachedEntries(userId);
      const { result } = await syncFromVault(
        userId,
        meta.handle,
        entries,
        meta,
        (updated) => {
          window.dispatchEvent(new CustomEvent("nw:vault-synced", { detail: updated }));
        },
      );
      await refresh();
      toast.success(
        `Sync complete · ${result.created} created · ${result.updated} updated · ${result.conflicts} conflicts`,
      );
    } catch (err) {
      console.error(err);
      toast.error("Vault sync failed");
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
      const entries = await readCachedEntries(userId);
      await writeAllEntriesToVault(meta.handle, entries, meta);
      await refresh();
      toast.success(`Wrote ${entries.length} pages to vault`);
    } catch (err) {
      console.error(err);
      toast.error("Couldn't write pages to vault");
    } finally {
      setBusy(null);
    }
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
      <div className="rounded-lg border border-border-subtle p-3 text-xs font-mono text-ink-2">
        export formats: markdown (.md), json (.json) · saves mirror to the connected folder automatically
      </div>
    </div>
  );
}
