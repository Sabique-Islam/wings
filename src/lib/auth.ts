import { supabase } from "@/integrations/supabase/client";
import { authRedirectUrl } from "./auth/redirect";

function formatAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("rate limit") || lower.includes("429")) {
    return "too many sign-in emails — wait a minute and try again, or use Google sign-in.";
  }
  return message;
}

/** Magic link only (Supabase uses /auth/v1/otp for link + code flows). */
export async function sendMagicLink(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: {
      emailRedirectTo: authRedirectUrl(),
      shouldCreateUser: true,
    },
  });
  return { error: error ? { ...error, message: formatAuthError(error.message) } : null };
}
