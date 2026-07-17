import { describe, it, expect } from "vitest";
import { isValidShareToken } from "./sharedEntry";

describe("isValidShareToken", () => {
  it("accepts 32-char lowercase hex tokens", () => {
    expect(isValidShareToken("a".repeat(32))).toBe(true);
    expect(isValidShareToken("0123456789abcdef0123456789abcdef")).toBe(true);
  });

  it("rejects invalid tokens", () => {
    expect(isValidShareToken("")).toBe(false);
    expect(isValidShareToken("abc")).toBe(false);
    expect(isValidShareToken("G".repeat(32))).toBe(false);
  });
});
