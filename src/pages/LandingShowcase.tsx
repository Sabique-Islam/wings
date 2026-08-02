import { Seo } from "@/components/Seo";
import { LoadingScreen } from "@/components/ui/spinner";
import { LandingCta } from "@/components/landing/LandingCta";
import { MarketingLayout } from "@/components/landing/MarketingLayout";
import { StackedScroll } from "@/components/landing/StackedScroll";
import { usePublicMarketingPage } from "@/hooks/usePublicMarketingPage";

export default function LandingShowcase() {
  const { ready } = usePublicMarketingPage();

  if (!ready) {
    return <LoadingScreen variant="flip" />;
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
