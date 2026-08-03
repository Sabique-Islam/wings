// Collects pasted/uploaded images referenced by the active page so the AI can
// see them as multimodal attachments (same pattern as Excalidraw snapshots).

import { PAGE_HREF_PREFIX } from "@/lib/linkExtraction";
import { urlToImageAttachment } from "@/lib/ai/imageAttachments";
import { ImageAttachment } from "@/lib/ai/types";

export interface PageImage {
  alt: string;
  url: string;
}

/** Max page images attached per request — matches AI panel pending cap. */
export const MAX_PAGE_IMAGES = 5;

const MD_IMAGE_RE = /!\[([^\]]*)\]\(([^)\s]+)\)/g;
const HTML_IMG_RE = /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
const EXCALIDRAW_IMAGE_URL_RE = /data-type=["']excalidraw["'][^>]*data-image-url=["']([^"']+)["']/gi;
const EXCALIDRAW_IMAGE_URL_RE_ALT =
  /data-image-url=["']([^"']+)["'][^>]*data-type=["']excalidraw["']/gi;

function isEligibleImageUrl(url: string): boolean {
  if (!url) return false;
  if (url.startsWith(PAGE_HREF_PREFIX)) return false;
  if (url.startsWith("http://") || url.startsWith("https://")) return true;
  if (url.startsWith("data:image/")) return true;
  return false;
}

/** URLs already owned by Excalidraw nodes — drawings attach those separately. */
function collectExcalidrawImageUrls(content: string): Set<string> {
  const urls = new Set<string>();
  for (const re of [EXCALIDRAW_IMAGE_URL_RE, EXCALIDRAW_IMAGE_URL_RE_ALT]) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      if (m[1]) urls.add(m[1]);
    }
  }
  return urls;
}

/**
 * Extract pasted/uploaded images from entry markdown or HTML.
 * Skips page embeds (`#page:…`) and Excalidraw snapshot URLs.
 */
export function collectImagesFromContent(content: string): PageImage[] {
  if (!content) return [];

  const skip = collectExcalidrawImageUrls(content);
  const seen = new Set<string>();
  const out: PageImage[] = [];

  const push = (alt: string, url: string) => {
    if (!isEligibleImageUrl(url)) return;
    if (skip.has(url)) return;
    if (seen.has(url)) return;
    seen.add(url);
    out.push({ alt: alt.trim(), url });
  };

  MD_IMAGE_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = MD_IMAGE_RE.exec(content)) !== null) {
    push(m[1] || "", m[2]);
  }

  HTML_IMG_RE.lastIndex = 0;
  while ((m = HTML_IMG_RE.exec(content)) !== null) {
    const tag = m[0];
    const altMatch = /\balt=["']([^"']*)["']/i.exec(tag);
    push(altMatch?.[1] || "", m[1]);
  }

  return out.slice(0, MAX_PAGE_IMAGES);
}

/** Fetch/decode page images as base64 ImageAttachments for multimodal LLMs. */
export async function imagesAsAttachments(images: PageImage[]): Promise<ImageAttachment[]> {
  const out: ImageAttachment[] = [];
  for (const img of images.slice(0, MAX_PAGE_IMAGES)) {
    const attachment = await urlToImageAttachment(img.url);
    if (attachment) out.push(attachment);
  }
  return out;
}
