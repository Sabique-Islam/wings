import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useParams } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import SharedEntry from "./pages/SharedEntry";
import NotFound from "./pages/NotFound";
import Landing from "./pages/Landing";
import Pricing from "./pages/Pricing";
import Legal from "./pages/Legal";
import EditorE2E from "./pages/EditorE2E";
import { About, Careers, Blog, Contact, Roadmap, Docs, Support, Status, Press } from "./pages/StaticPages";
import { CookieBanner } from "@/components/CookieBanner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { DitherFilterDefs } from "@/lib/dither/filters";
import { AsciiSpinner } from "@/components/AsciiAnimation";
import { useEffect, useState } from "react";
import { getMyUsername } from "@/lib/profile";

const queryClient = new QueryClient();

function UsernameGate() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const [state, setState] = useState<"loading" | "ok" | "deny">("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user || !username) { setState("deny"); return; }
      const my = await getMyUsername(user.id);
      if (cancelled) return;
      if (my && my.toLowerCase() === username.toLowerCase()) {
        setState("ok");
      } else {
        // verify the username exists at all? either way, deny if not yours
        setState("deny");
      }
    })();
    return () => { cancelled = true; };
  }, [user, username]);

  if (state === "loading") {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <AsciiSpinner />
      </div>
    );
  }
  if (state === "deny") return <NotFound />;
  return <Index />;
}


function AppRoutes() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <AsciiSpinner />
      </div>
    );
  }

  return (
    <Routes>
      {/* Public marketing */}
      <Route path="/" element={<Landing />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/about" element={<About />} />
      <Route path="/careers" element={<Careers />} />
      <Route path="/blog" element={<Blog />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/changelog" element={<Navigate to="/roadmap" replace />} />
      <Route path="/roadmap" element={<Roadmap />} />
      <Route path="/docs" element={<Docs />} />
      <Route path="/support" element={<Support />} />
      <Route path="/status" element={<Status />} />
      <Route path="/press" element={<Press />} />
      <Route path="/legal/privacy" element={<Legal slug="privacy" />} />
      <Route path="/legal/terms" element={<Legal slug="terms" />} />
      <Route path="/legal/security" element={<Legal slug="security" />} />
      <Route path="/legal/cookies" element={<Legal slug="cookies" />} />
      <Route path="/__editor-e2e" element={import.meta.env.DEV ? <EditorE2E /> : <NotFound />} />

      <Route path="/auth" element={<Auth />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/s/:token" element={<SharedEntry />} />

      {/* Authenticated app */}
      <Route path="/app" element={<RequireAuth><Index /></RequireAuth>} />
      <Route path="/app/n/:id" element={<RequireAuth><Index /></RequireAuth>} />
      <Route path="/n/:id" element={<RequireAuth><Index /></RequireAuth>} />
      <Route path="/:username" element={<UsernameGate />} />
      <Route path="/:username/n/:id" element={<UsernameGate />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function RequireAuth({ children }: { children: JSX.Element }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/auth" replace />;
  return children;
}

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <DitherFilterDefs />
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <BrowserRouter>
            <ErrorBoundary>
              <AppRoutes />
            </ErrorBoundary>
            <CookieBanner />
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
