import { ReactNode } from "react";
import { NavBar } from "./NavBar";
import { Footer } from "./Footer";
import { Dither } from "@/components/ui/Dither";

interface Props {
  children: ReactNode;
  ctaHref?: string;
  ctaLabel?: string;
}

export function MarketingLayout({ children, ctaHref = "/auth", ctaLabel = "sign in" }: Props) {
  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-x-clip">
      <Dither variant="grain" fade="radial" density="sparse" className="opacity-100" />
      <NavBar ctaHref={ctaHref} ctaLabel={ctaLabel} />
      {children}
      <Footer />
    </div>
  );
}
