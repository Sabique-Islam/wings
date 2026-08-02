import { Seo } from "@/components/Seo";
import { LoadingScreen } from "@/components/ui/spinner";
import { FeatureGrid } from "@/components/landing/FeatureGrid";
import { InfiniteMarquee } from "@/components/landing/InfiniteMarquee";
import { LandingCta } from "@/components/landing/LandingCta";
import { MarketingLayout } from "@/components/landing/MarketingLayout";
import { usePublicMarketingPage } from "@/hooks/usePublicMarketingPage";

export default function LandingFeatures() {
  const { ready } = usePublicMarketingPage();

  if (!ready) {
    return <LoadingScreen variant="flip" />;
  }

  return (
    <>
      <Seo
        title="features"
        path="/features"
        description="Wings features: block editor, LaTeX math, Excalidraw, AI panel, sharing, and offline draft cache."
      />
      <MarketingLayout>
        <main className="pt-14">
          <InfiniteMarquee items={["markdown", "latex", "excalidraw", "ai panel", "block editor", "draft cache", "share links", "slash commands"]} />
          <FeatureGrid />
          <InfiniteMarquee reverse items={["⌘J ai", "/ slash", "$$ math $$", "≡ blocks", "✎ drawings", "↗ /s/", "⌘K palette"]} />
          <LandingCta />
        </main>
      </MarketingLayout>
    </>
  );
}
