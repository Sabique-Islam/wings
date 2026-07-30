import { ALLOWED_IMAGE_MIMES, MAX_IMAGE_BYTES } from "@/lib/imageUpload";
import { ImageAttachment } from "./types";

export function isAllowedImageFile(file: File): boolean {
  return ALLOWED_IMAGE_MIMES.has(file.type) && file.size <= MAX_IMAGE_BYTES;
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
