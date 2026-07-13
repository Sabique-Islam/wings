import { getMyUsername } from "@/lib/profile";

/** Where Supabase sends users after magic link / OAuth (must be allowlisted in the dashboard). */
export function authRedirectUrl(): string {
  return `${window.location.origin}/auth/callback`;
}

/** Resolve dashboard path — waits briefly for username trigger on new signups. */
export async function getDashboardPath(userId: string): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const username = await getMyUsername(userId);
    if (username) return `/${username}`;
    if (attempt < 7) await new Promise((r) => setTimeout(r, 250));
  }
  return "/app";
}
