import { supabase } from "@/integrations/supabase/client";

export async function uploadImage(file: File, userId: string): Promise<string | null> {
  const ext = file.name.split(".").pop() || "png";
  const name = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage
    .from("journal-images")
    .upload(name, file, { contentType: file.type, upsert: false });

  if (error) {
    console.error("Upload failed:", error.message);
    return null;
  }

  // Bucket is now private — use signed URLs (1 year expiry)
  const { data } = await supabase.storage
    .from("journal-images")
    .createSignedUrl(name, 60 * 60 * 24 * 365);

  return data?.signedUrl ?? null;
}
