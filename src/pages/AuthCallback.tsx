import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getDashboardPath } from "@/lib/auth/redirect";
import { AsciiSpinner } from "@/components/AsciiAnimation";
import { Seo } from "@/components/Seo";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const errorDescription = params.get("error_description") ?? params.get("error");

      if (errorDescription) {
        if (!cancelled) {
          setError(errorDescription);
          setTimeout(() => navigate("/auth", { replace: true }), 2500);
        }
        return;
      }

      try {
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        }

        // PKCE code exchange, or implicit tokens in the URL hash (detectSessionInUrl).
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!session) throw new Error("Sign-in did not complete. Request a new magic link.");

        const path = await getDashboardPath(session.user.id);
        if (!cancelled) navigate(path, { replace: true });
      } catch (e) {
        if (!cancelled) {
          setError((e as Error).message);
          setTimeout(() => navigate("/auth", { replace: true }), 2500);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <>
      <Seo title="signing in" path="/auth/callback" noIndex />
      <div className="flex flex-col items-center justify-center h-screen bg-background gap-3 px-6 text-center">
        {error ? (
          <>
            <p className="text-sm text-destructive font-mono">{error}</p>
            <p className="text-xs text-ink-2">redirecting to sign in…</p>
          </>
        ) : (
          <>
            <AsciiSpinner />
            <p className="text-xs text-ink-2 font-mono">finishing sign-in…</p>
          </>
        )}
      </div>
    </>
  );
}
