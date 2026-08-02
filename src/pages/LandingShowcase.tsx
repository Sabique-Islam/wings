import { Seo } from "@/components/Seo";
import { AsciiSpinner } from "@/components/AsciiAnimation";
import { LandingCta } from "@/components/landing/LandingCta";
import { MarketingLayout } from "@/components/landing/MarketingLayout";
import { StackedScroll } from "@/components/landing/StackedScroll";
import { usePublicMarketingPage } from "@/hooks/usePublicMarketingPage";

export default function LandingShowcase() {
  const { ready } = usePublicMarketingPage();

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <AsciiSpinner />
      </div>
    );
  }

  return (
    <>
      <Seo
        title="showcase"
        path="/showcase"
        description="See how Wings handles blocks, AI with page context, and sharing by link or invite."
      />
      <MarketingLayout>
        <main className="pt-14">
          <StackedScroll />
          <LandingCta />
        </main>
      </MarketingLayout>
    </>
  );
}
