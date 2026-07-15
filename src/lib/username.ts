import { supabase } from "@/integrations/supabase/client";

export const USERNAME_REGEX = /^[a-z0-9](?:[a-z0-9_-]{1,29})$/;

export const RESERVED_USERNAMES = new Set([
  "admin", "root", "auth", "login", "logout", "signup", "signin",
  "api", "app", "n", "s", "pricing", "about", "careers", "blog",
  "contact", "changelog", "roadmap", "docs", "support", "status",
  "press", "legal", "privacy", "terms", "security", "cookies",
  "settings", "account", "profile", "user", "users", "team",
  "dashboard", "home", "help", "sitemap", "robots", "well-known",
  "billing", "checkout", "pay", "payments", "404", "500",
]);

export interface UsernameCheckResult {
  ok: boolean;
  reason?: "invalid" | "reserved" | "taken" | "too_short" | "too_long";
  message?: string;
}

export function validateUsername(raw: string): UsernameCheckResult {
  const u = raw.trim().toLowerCase();
  if (u.length < 2) return { ok: false, reason: "too_short", message: "min 2 characters" };
  if (u.length > 30) return { ok: false, reason: "too_long", message: "max 30 characters" };
  if (!USERNAME_REGEX.test(u)) return { ok: false, reason: "invalid", message: "letters, numbers, _ and - only" };
  if (RESERVED_USERNAMES.has(u)) return { ok: false, reason: "reserved", message: "this name is reserved" };
  return { ok: true };
}

export async function isUsernameAvailable(username: string, excludeUserId?: string): Promise<boolean> {
  const u = username.trim().toLowerCase();
  const { data, error } = await supabase.rpc("is_username_available", {
    _username: u,
    _exclude_user_id: excludeUserId ?? undefined,
  });
  // Fail closed: treat lookup errors as "not available" so we never hand out a
  // name we couldn't verify.
  if (error) return false;
  return data === true;
}
