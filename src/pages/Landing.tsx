import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getDashboardPath } from "@/lib/auth/redirect";
import { useNavigate } from "react-router-dom";
import { Hero } from "@/components/landing/Hero";
import { NavBar } from "@/components/landing/NavBar";
import { InfiniteMarquee } from "@/components/landing/InfiniteMarquee";
import { FeatureGrid } from "@/components/landing/FeatureGrid";
import { StackedScroll } from "@/components/landing/StackedScroll";
import { Footer } from "@/components/landing/Footer";
import { Seo } from "@/components/Seo";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { motionEase } from "@/components/landing/constants";
import { AsciiSpinner } from "@/components/AsciiAnimation";
import { Dither } from "@/components/ui/Dither";
import { registerLandingWebMcp } from "@/lib/webmcp";

export default function Landing() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    getDashboardPath(user.id).then((path) => navigate(path, { replace: true }));
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (authLoading || user) return;
    return registerLandingWebMcp();
  }, [authLoading, user]);

  if (authLoading || user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <AsciiSpinner />
      </div>
    );
  }

  const ctaHref = "/auth";
  const ctaLabel = "sign in";

  return (
    <>
      <Seo path="/" jsonLd />
      <div className="relative min-h-screen bg-background text-foreground overflow-x-hidden">
        <Dither variant="grain" fade="radial" density="sparse" className="opacity-100" />
        <NavBar ctaHref={ctaHref} ctaLabel={ctaLabel} />
        <Hero ctaHref={ctaHref} />
        <InfiniteMarquee items={["markdown", "latex", "excalidraw", "ai panel", "block editor", "draft cache", "share links", "slash commands"]} />
        <FeatureGrid />
        <InfiniteMarquee reverse items={["⌘J ai", "/ slash", "$$ math $$", "≡ blocks", "✎ drawings", "↗ /s/", "⌘K palette"]} />
        <StackedScroll />
        <section className="relative py-24 sm:py-32 px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: motionEase }}
              className="font-display font-bold text-3xl sm:text-4xl md:text-6xl tracking-tight leading-tight"
            >try it — it's free.</motion.h2>
            <Link
              to={ctaHref}
              className="inline-flex items-center gap-2 rounded-full bg-accent-strong text-accent-strong-foreground px-7 sm:px-8 py-3.5 sm:py-4 text-[11px] sm:text-xs font-mono uppercase tracking-[0.2em] hover:scale-[1.03] transition-transform"
            >
              open the app <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>
        <Footer />
      </div>
    </>
  );
}
