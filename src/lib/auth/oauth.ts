import { supabase } from "@/integrations/supabase/client";

export interface OAuthOutcome {
  redirected?: boolean;
  error?: { message: string };
}

/** Google OAuth via Supabase Auth — browser redirects and returns with a session. */
export async function signInWithGoogle(redirectTo: string = window.location.origin): Promise<OAuthOutcome> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      queryParams: { prompt: "select_account" },
    },
  });
  if (error) return { error: { message: error.message } };
  return { redirected: true };
}
