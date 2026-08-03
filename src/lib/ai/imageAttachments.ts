import { ALLOWED_IMAGE_MIMES, MAX_IMAGE_BYTES } from "@/lib/imageUpload";
import { ImageAttachment } from "./types";

export function isAllowedImageFile(file: File): boolean {
  return ALLOWED_IMAGE_MIMES.has(file.type) && file.size <= MAX_IMAGE_BYTES;
}

export function blobToBase64(blob: Blob): Promise<string> {
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

/** Decode a `data:image/...;base64,...` URL into an ImageAttachment. */
export function dataUrlToImageAttachment(dataUrl: string): ImageAttachment | null {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s.exec(dataUrl);
  if (!match) return null;
  const mimeType = match[1];
  const base64 = match[2];
  if (!base64 || !ALLOWED_IMAGE_MIMES.has(mimeType)) return null;
  return { base64, mimeType };
}

/**
 * Fetch an http(s) image URL (or decode a data URL) into an ImageAttachment.
 * Returns null on failure — callers skip silently.
 */
export async function urlToImageAttachment(url: string): Promise<ImageAttachment | null> {
  if (!url) return null;
  if (url.startsWith("data:")) return dataUrlToImageAttachment(url);
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const blob = await resp.blob();
    if (blob.size > MAX_IMAGE_BYTES) return null;
    const base64 = await blobToBase64(blob);
    if (!base64) return null;
    const mimeType = blob.type && ALLOWED_IMAGE_MIMES.has(blob.type) ? blob.type : "image/png";
    return { base64, mimeType };
  } catch {
    return null;
  }
}

export async function fileToImageAttachment(file: File): Promise<ImageAttachment | null> {
  if (!isAllowedImageFile(file)) return null;
  try {
    const base64 = await blobToBase64(file);
    if (!base64) return null;
    return { base64, mimeType: file.type };
  } catch {
    return null;
  }
}

export async function filesToImageAttachments(files: File[]): Promise<ImageAttachment[]> {
  const out: ImageAttachment[] = [];
  for (const file of files) {
    const attachment = await fileToImageAttachment(file);
    if (attachment) out.push(attachment);
  }
  return out;
}
