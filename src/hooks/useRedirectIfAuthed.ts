import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getDashboardPath } from "@/lib/auth/redirect";

/** Send authenticated users to their dashboard (e.g. on /auth or /). */
export function useRedirectIfAuthed(enabled = true) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!enabled || loading || !user) return;
    let cancelled = false;
    getDashboardPath(user.id).then((path) => {
      if (!cancelled) navigate(path, { replace: true });
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, user, loading, navigate]);
}
