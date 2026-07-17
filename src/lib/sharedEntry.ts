const TOKEN_RE = /^[a-f0-9]{32}$/;

export interface SharedEntryRow {
  content: string;
  title: string;
  created_at: string;
}

export function isValidShareToken(token: string): boolean {
  return TOKEN_RE.test(token);
}

/** Load a published entry by public share token (anon-safe). */
export async function fetchSharedEntry(token: string): Promise<SharedEntryRow | null> {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data, error } = await supabase.rpc("get_shared_entry", { _token: token });
  if (!error) {
    const row = Array.isArray(data) ? data[0] : data;
    return row ?? null;
  }

  // Deployments that have not run 20260715030100 yet — use the legacy view + header gate.
  const rpcMissing =
    error.code === "PGRST202" ||
    (error.message?.includes("get_shared_entry") ?? false);
  if (!rpcMissing) return null;

  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!baseUrl || !apiKey) return null;

  const url =
    `${baseUrl}/rest/v1/shared_entries_view` +
    `?share_token=eq.${encodeURIComponent(token)}` +
    "&select=content,title,created_at&limit=1";

  const res = await fetch(url, {
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
      "x-share-token": token,
    },
  });
  if (!res.ok) return null;

  const rows = (await res.json()) as SharedEntryRow[];
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}
