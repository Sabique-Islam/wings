import { describe, it, expect } from "vitest";
import { isBlockedHost, isPublicUrl } from "../../supabase/functions/_shared/ssrf.ts";

describe("isBlockedHost", () => {
  it("blocks loopback and RFC1918", () => {
    expect(isBlockedHost("127.0.0.1")).toBe(true);
    expect(isBlockedHost("10.0.0.1")).toBe(true);
    expect(isBlockedHost("192.168.1.1")).toBe(true);
    expect(isBlockedHost("172.16.0.1")).toBe(true);
    expect(isBlockedHost("169.254.169.254")).toBe(true);
    expect(isBlockedHost("metadata.google.internal")).toBe(true);
  });

  it("allows public hosts", () => {
    expect(isBlockedHost("example.com")).toBe(false);
    expect(isBlockedHost("github.com")).toBe(false);
  });
});

describe("isPublicUrl", () => {
  it("accepts https public URLs", () => {
    expect(isPublicUrl("https://example.com/page")).toBe(true);
  });

  it("rejects non-http schemes and credentials", () => {
    expect(isPublicUrl("file:///etc/passwd")).toBe(false);
    expect(isPublicUrl("https://user:pass@example.com")).toBe(false);
  });

  it("rejects internal targets", () => {
    expect(isPublicUrl("http://127.0.0.1/admin")).toBe(false);
    expect(isPublicUrl("http://172.31.0.1/")).toBe(false);
  });
});
