import { parseVaultMarkdown } from "./frontmatter";
import type { VaultFileEntry } from "./types";

async function scanDirectory(
  dir: FileSystemDirectoryHandle,
  prefix: string,
  out: VaultFileEntry[],
): Promise<void> {
  for await (const [name, handle] of dir.entries()) {
    const path = prefix ? `${prefix}/${name}` : name;
    if (handle.kind === "directory") {
      await scanDirectory(handle, path, out);
      continue;
    }
    if (!name.endsWith(".md")) continue;
    const file = await handle.getFile();
    const raw = await file.text();
    const parsed = parseVaultMarkdown(raw);
    out.push({
      wingsId: parsed.wingsId,
      title: parsed.title,
      content: parsed.body,
      relativePath: path,
      lastModified: file.lastModified,
    });
  }
}

export async function scanVaultFolder(handle: FileSystemDirectoryHandle): Promise<VaultFileEntry[]> {
  const files: VaultFileEntry[] = [];
  await scanDirectory(handle, "", files);
  return files;
}
