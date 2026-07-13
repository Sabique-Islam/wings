export const PRICING_TIERS = [
  {
    id: "free",
    name: "free",
    price: "$0",
    cadence: "/forever",
    tagline: "for the curious.",
    features: ["3 notebooks", "markdown + latex", "100mb storage", "community support"],
    cta: "start free",
    accent: false,
    productId: "" as string, // dodo product id (set later)
  },
  {
    id: "explorer",
    name: "explorer",
    price: "$8",
    cadence: "/month",
    tagline: "for daily thinkers.",
    features: [
      "unlimited notebooks",
      "agentic ai (200/day)",
      "5gb storage",
      "drawings & whiteboards",
      "priority email",
    ],
    cta: "go explorer",
    accent: false,
    productId: "" as string,
  },
  {
    id: "scholar",
    name: "scholar",
    price: "$24",
    cadence: "/month",
    tagline: "for the obsessed.",
    features: [
      "everything in explorer",
      "unlimited ai requests",
      "100gb storage",
      "private publishing",
      "early access features",
      "white-glove support",
    ],
    cta: "go scholar",
    accent: true,
    productId: "" as string,
  },
] as const;

export type PricingTier = (typeof PRICING_TIERS)[number];
