import { supabase } from "@/integrations/supabase/client";

export async function getMyUsername(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("user_preferences")
    .select("username")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.username ?? null;
}

export async function getUserIdByUsername(username: string): Promise<string | null> {
  const { data } = await supabase
    .from("user_preferences")
    .select("user_id, username")
    .ilike("username", username)
    .maybeSingle();
  return data?.user_id ?? null;
}

export async function setUsername(userId: string, username: string): Promise<{ ok: boolean; error?: string }> {
  const u = username.trim().toLowerCase();
  const { error } = await supabase
    .from("user_preferences")
    .update({ username: u })
    .eq("user_id", userId);
  if (error) {
    if (/duplicate|unique/i.test(error.message)) return { ok: false, error: "username already taken" };
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
