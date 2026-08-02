import { describe, expect, it, beforeEach } from "vitest";
import { clearCookieConsent, isAnalyticsEnabled, setCookieConsent } from "./CookieBanner";

describe("isAnalyticsEnabled", () => {
  beforeEach(() => {
    clearCookieConsent();
  });

  it("returns true when no consent has been stored", () => {
    expect(isAnalyticsEnabled()).toBe(true);
  });

  it("returns true when analytics was accepted", () => {
    setCookieConsent({
      decidedAt: Date.now(),
      essential: true,
      analytics: true,
      marketing: false,
    });
    expect(isAnalyticsEnabled()).toBe(true);
  });

  it("returns false when analytics was rejected", () => {
    setCookieConsent({
      decidedAt: Date.now(),
      essential: true,
      analytics: false,
      marketing: false,
    });
    expect(isAnalyticsEnabled()).toBe(false);
  });
});
