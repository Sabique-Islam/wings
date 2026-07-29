import {
  deleteVaultMeta,
  putVaultMeta,
  readVaultMeta,
  type VaultMetaRow,
} from "@/lib/localStore";
import { isVaultSupported } from "./types";

export async function connectVault(userId: string): Promise<VaultMetaRow | null> {
  if (!isVaultSupported()) return null;
  const handle = await window.showDirectoryPicker({ mode: "readwrite" });
  const permission = await handle.requestPermission({ mode: "readwrite" });
  if (permission !== "granted") return null;
  const row: VaultMetaRow = {
    userId,
    folderName: handle.name,
    connectedAt: Date.now(),
    handle,
    lastWrittenAt: {},
    lastWrittenHash: {},
  };
  const existing = await readVaultMeta(userId);
  if (existing) {
    row.lastWrittenAt = existing.lastWrittenAt ?? {};
    row.lastWrittenHash = existing.lastWrittenHash ?? {};
  }
  await putVaultMeta(row);
  return row;
}

export async function disconnectVault(userId: string): Promise<void> {
  await deleteVaultMeta(userId);
}

export async function getVaultMeta(userId: string): Promise<VaultMetaRow | null> {
  return readVaultMeta(userId);
}

export async function ensureVaultPermission(meta: VaultMetaRow): Promise<boolean> {
  if (!meta.handle) return false;
  const permission = await meta.handle.requestPermission({ mode: "readwrite" });
  return permission === "granted";
}
