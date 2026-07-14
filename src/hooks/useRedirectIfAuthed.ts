import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getDashboardPath } from "@/lib/auth/redirect";

/** Send authenticated users to their dashboard (e.g. on /auth or /). */
export function useRedirectIfAuthed(enabled = true) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (!enabled || loading || !user) return;
    const returnTo = searchParams.get("returnTo");
    if (returnTo && returnTo.startsWith("/")) {
      navigate(returnTo, { replace: true });
      return;
    }
    let cancelled = false;
    getDashboardPath(user.id).then((path) => {
      if (!cancelled) navigate(path, { replace: true });
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, user, loading, navigate, searchParams]);
}
