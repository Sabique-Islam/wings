import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getDashboardPath } from "@/lib/auth/redirect";

/** Redirect signed-in users to their workspace; gate public marketing pages. */
export function usePublicMarketingPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading || !user) return;
    getDashboardPath(user.id).then((path) => navigate(path, { replace: true }));
  }, [user, authLoading, navigate]);

  return { authLoading, user, ready: !authLoading && !user };
}
