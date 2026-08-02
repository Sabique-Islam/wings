import { describe, expect, it } from "vitest";
import { buildDocumentTitle } from "./documentTitle";
import { SITE } from "@/config/site";

describe("buildDocumentTitle", () => {
  it("returns tagline form when no page title", () => {
    expect(buildDocumentTitle()).toBe(`${SITE.name} | ${SITE.tagline}`);
    expect(buildDocumentTitle(null)).toBe(`${SITE.name} | ${SITE.tagline}`);
    expect(buildDocumentTitle("")).toBe(`${SITE.name} | ${SITE.tagline}`);
    expect(buildDocumentTitle("   ")).toBe(`${SITE.name} | ${SITE.tagline}`);
  });

  it("returns page title with pipe separator", () => {
    expect(buildDocumentTitle("features")).toBe(`features | ${SITE.name}`);
    expect(buildDocumentTitle("N-Queens Solution")).toBe(`N-Queens Solution | ${SITE.name}`);
  });

  it("trims whitespace from page titles", () => {
    expect(buildDocumentTitle("  workspace  ")).toBe(`workspace | ${SITE.name}`);
  });
});
