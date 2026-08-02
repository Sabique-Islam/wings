import { useEffect } from "react";
import { usePublicMarketingPage } from "@/hooks/usePublicMarketingPage";
import { registerLandingWebMcp } from "@/lib/webmcp";
import { Hero } from "@/components/landing/Hero";
import { InfiniteMarquee } from "@/components/landing/InfiniteMarquee";
import { FeatureGrid } from "@/components/landing/FeatureGrid";
import { StackedScroll } from "@/components/landing/StackedScroll";
import { LandingCta } from "@/components/landing/LandingCta";
import { MarketingLayout } from "@/components/landing/MarketingLayout";
import { Seo } from "@/components/Seo";
import { LoadingScreen } from "@/components/ui/spinner";

export default function Landing() {
  const { ready } = usePublicMarketingPage();

  useEffect(() => {
    if (!ready) return;
    return registerLandingWebMcp();
  }, [ready]);

  if (!ready) {
    return <LoadingScreen variant="flip" />;
  }

  const ctaHref = "/auth";

  return (
    <>
      <Seo path="/" jsonLd />
      <MarketingLayout ctaHref={ctaHref}>
        <Hero ctaHref={ctaHref} />
        <InfiniteMarquee items={["markdown", "latex", "excalidraw", "ai panel", "block editor", "draft cache", "share links", "slash commands"]} />
        <FeatureGrid />
        <InfiniteMarquee reverse items={["⌘J ai", "/ slash", "$$ math $$", "≡ blocks", "✎ drawings", "↗ /s/", "⌘K palette"]} />
        <StackedScroll />
        <LandingCta ctaHref={ctaHref} />
      </MarketingLayout>
    </>
  );
}
