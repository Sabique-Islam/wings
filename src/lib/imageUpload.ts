import { supabase } from "@/integrations/supabase/client";

// Only allow real image types, and derive the extension from the MIME type
// rather than trusting the (attacker-controllable) filename.
const MIME_TO_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "image/avif": "avif",
};

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
export const ALLOWED_IMAGE_MIMES = new Set(Object.keys(MIME_TO_EXT));
const SIGNED_URL_TTL = 60 * 60 * 24 * 30; // 30 days (was 1 year — shorter blast radius if a URL leaks)

export async function uploadImage(file: File, userId: string): Promise<string | null> {
  const ext = MIME_TO_EXT[file.type];
  if (!ext) {
    console.error("Upload rejected: unsupported image type");
    return null;
  }
  if (file.size > MAX_IMAGE_BYTES) {
    console.error("Upload rejected: file too large");
    return null;
  }

  const rand = crypto.getRandomValues(new Uint8Array(8));
  const suffix = Array.from(rand, (b) => b.toString(16).padStart(2, "0")).join("");
  const name = `${userId}/${Date.now()}-${suffix}.${ext}`;

  const { error } = await supabase.storage
    .from("journal-images")
    .upload(name, file, { contentType: file.type, upsert: false });

  if (error) {
    console.error("Upload failed");
    return null;
  }

  const { data } = await supabase.storage
    .from("journal-images")
    .createSignedUrl(name, SIGNED_URL_TTL);

  return data?.signedUrl ?? null;
}
