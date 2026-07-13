import { SITE } from "@/config/site";

export const FOOTER_LINKS: { h: string; links: { l: string; to: string }[] }[] = [
  {
    h: "product",
    links: [
      { l: "features", to: "/#features" },
      { l: "pricing", to: "/pricing" },
      { l: "roadmap", to: "/roadmap" },
    ],
  },
  {
    h: "company",
    links: [
      { l: "about", to: "/about" },
      { l: "careers", to: "/careers" },
      { l: "blog", to: "/blog" },
      { l: "contact", to: "/contact" },
    ],
  },
  {
    h: "legal",
    links: [
      { l: "privacy", to: "/legal/privacy" },
      { l: "terms", to: "/legal/terms" },
      { l: "security", to: "/legal/security" },
      { l: "cookies", to: "/legal/cookies" },
    ],
  },
  {
    h: "resources",
    links: [
      { l: "docs", to: "/docs" },
      { l: "support", to: "/support" },
      { l: "status", to: "/status" },
      { l: "press", to: "/press" },
    ],
  },
];

export const NAV_LINKS = [
  { l: "features", to: "/#features" },
  { l: "showcase", to: "/#showcase" },
  { l: "pricing", to: "/pricing" },
];

export const SOCIAL = {
  discord: SITE.social.discord,
  github: SITE.social.github,
  email: `mailto:${SITE.email}`,
};
