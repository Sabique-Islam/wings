import { SITE } from "@/config/site";

/** Browser tab title: `page | wings` or `wings | tagline` when no page title. */
export function buildDocumentTitle(pageTitle?: string | null): string {
  const trimmed = pageTitle?.trim();
  if (trimmed) return `${trimmed} | ${SITE.name}`;
  return `${SITE.name} | ${SITE.tagline}`;
}
