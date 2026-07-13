import { supabase } from "@/integrations/supabase/client";
import { authRedirectUrl } from "./auth/redirect";

export async function sendMagicLink(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: {
      emailRedirectTo: authRedirectUrl(),
      shouldCreateUser: true,
    },
  });
  return { error };
}

export async function sendEmailOtp(email: string) {
  // signInWithOtp without emailRedirectTo still sends the 6-digit code
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { shouldCreateUser: true },
  });
  return { error };
}

export async function verifyEmailOtp(email: string, token: string) {
  const { data, error } = await supabase.auth.verifyOtp({
    email: email.trim(),
    token: token.trim(),
    type: "email",
  });
  return { data, error };
}
