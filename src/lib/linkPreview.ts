import { supabase } from "@/integrations/supabase/client";
import { isSafeHttpUrl } from "@/lib/safeUrl";

export interface LinkPreviewMeta {
  title?: string;
  description?: string;
  favicon?: string;
}

/** Fetch OG metadata via Supabase edge function (server-side, SSRF-safe). */
export async function fetchLinkPreview(url: string): Promise<LinkPreviewMeta | null> {
  if (!isSafeHttpUrl(url)) return null;
  try {
    const { data, error } = await supabase.functions.invoke("fetch-link-preview", {
      body: { url },
    });
    if (error || !data) return null;
    return data as LinkPreviewMeta;
  } catch {
    return null;
  }
}
