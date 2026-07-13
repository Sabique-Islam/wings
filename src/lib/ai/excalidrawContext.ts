// Collects excalidraw scene snapshots referenced by the active page so the
// AI can "see" the drawings the user has placed in the same session.

import { loadScene } from "@/lib/drawingStore";
import { ImageAttachment } from "@/lib/ai/types";

export interface DrawingSnapshot {
  sceneId: string;
  imageUrl: string | null;
  elementCount: number;
  width?: number;
}

// Session-level cache of the freshest imageUrl per sceneId. DrawingCanvas
// dispatches `nw:drawingUpdated` after each save; we keep the latest URL here
// so the AI always sees the most recent drawing snapshot even if the entry
// markdown hasn't been re-persisted yet.
const sessionSnapshots = new Map<string, string>();

if (typeof window !== "undefined") {
  window.addEventListener("nw:drawingUpdated", (e: Event) => {
    const detail = (e as CustomEvent).detail as { sceneId?: string; imageUrl?: string } | undefined;
    if (detail?.sceneId && detail?.imageUrl) {
      sessionSnapshots.set(detail.sceneId, detail.imageUrl);
    }
  });
}

export function rememberDrawingSnapshot(sceneId: string, imageUrl: string) {
  sessionSnapshots.set(sceneId, imageUrl);
}

/**
 * Extract every excalidraw drawing referenced by the current entry content.
 * Accepts the entry markdown / HTML — we scan for sceneId tokens written by
 * the ExcalidrawExtension and image markdown produced by exported drawings.
 */
export function collectDrawingsFromContent(content: string): DrawingSnapshot[] {
  if (!content) return [];
  const ids = new Set<string>();

  // <div data-type='excalidraw' data-scene-id='...' data-image-url='...'>
  const tagRe = /data-scene-id=["']([^"']+)["'][^>]*?(?:data-image-url=["']([^"']*)["'])?/g;
  let m: RegExpExecArray | null;
  const inlineImages: Record<string, string> = {};
  while ((m = tagRe.exec(content)) !== null) {
    ids.add(m[1]);
    if (m[2]) inlineImages[m[1]] = m[2];
  }

  const out: DrawingSnapshot[] = [];
  for (const id of ids) {
    const scene = loadScene(id);
    // Prefer the freshest URL captured this session over whatever was in the
    // saved markdown.
    const imageUrl = sessionSnapshots.get(id) || inlineImages[id] || null;
    out.push({
      sceneId: id,
      imageUrl,
      elementCount: Array.isArray(scene?.elements) ? scene.elements.length : 0,
    });
  }
  return out;
}

/** Fetch each drawing as a base64 ImageAttachment for multimodal LLMs. */
export async function snapshotsAsAttachments(snaps: DrawingSnapshot[]): Promise<ImageAttachment[]> {
  const out: ImageAttachment[] = [];
  for (const s of snaps) {
    if (!s.imageUrl) continue;
    try {
      const resp = await fetch(s.imageUrl);
      if (!resp.ok) continue;
      const blob = await resp.blob();
      const b64 = await blobToBase64(blob);
      out.push({ base64: b64, mimeType: blob.type || "image/png" });
    } catch {
      // ignore — drawing simply won't be in context
    }
  }
  return out;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = (r.result as string) || "";
      const i = s.indexOf("base64,");
      resolve(i >= 0 ? s.slice(i + "base64,".length) : "");
    };
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}
