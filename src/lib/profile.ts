import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { isUsernameAvailable } from "@/lib/username";

type UserPreferencesUpdate = TablesUpdate<"user_preferences">;
export type UserPreferencesPatch = UserPreferencesUpdate;
function deriveBaseUsername(userId: string, email?: string | null): string {
  let base = "";
  if (email) {
    base = email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "");
  }
  if (base.length < 3) {
    base = `user${userId.replace(/-/g, "").slice(0, 6)}`;
  }
  return base.slice(0, 24);
}

async function findAvailableUsername(base: string, excludeUserId?: string): Promise<string> {
  let candidate = base;
  let suffix = 0;
  for (let attempt = 0; attempt < 100; attempt++) {
    const taken = !(await isUsernameAvailable(candidate, excludeUserId));
    if (!taken) return candidate;
    suffix += 1;
    candidate = `${base}${suffix}`;
  }
  return `user${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
}

/**
 * Ensures a user_preferences row exists (signup trigger may have been skipped).
 * Returns the current username. Username derivation mirrors `handle_new_user_preferences`.
 */
export async function ensureUserPreferencesRow(
  userId: string,
  email?: string | null,
): Promise<string> {
  const { data: existing } = await supabase
    .from("user_preferences")
    .select("username")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing?.username) return existing.username;

  const username = await findAvailableUsername(deriveBaseUsername(userId, email), userId);
  const { error } = await supabase.from("user_preferences").insert({ user_id: userId, username });

  if (error) {
    if (/duplicate|unique|23505/i.test(error.message)) {
      const { data: retry } = await supabase
        .from("user_preferences")
        .select("username")
        .eq("user_id", userId)
        .maybeSingle();
      if (retry?.username) return retry.username;
    }
    throw error;
  }

  return username;
}

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

export async function setUsername(
  userId: string,
  username: string,
  email?: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const u = username.trim().toLowerCase();
  try {
    await ensureUserPreferencesRow(userId, email);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

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

export async function updateUserPreferences(
  userId: string,
  patch: UserPreferencesUpdate,
  email?: string | null,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await ensureUserPreferencesRow(userId, email);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  const { error } = await supabase
    .from("user_preferences")
    .update(patch)
    .eq("user_id", userId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
