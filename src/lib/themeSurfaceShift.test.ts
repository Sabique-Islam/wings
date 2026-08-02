import { describe, expect, it } from "vitest";
import {
  clampSurfaceShift,
  parseStoredSurfaceShift,
  resolveSurfaceShift,
  surfaceShiftCSSValue,
  SURFACE_SHIFT_MAX,
  SURFACE_SHIFT_MIN,
} from "@/lib/themeSurfaceShift";

describe("clampSurfaceShift", () => {
  it("clamps values to the allowed range", () => {
    expect(clampSurfaceShift(-50)).toBe(SURFACE_SHIFT_MIN);
    expect(clampSurfaceShift(50)).toBe(SURFACE_SHIFT_MAX);
    expect(clampSurfaceShift(7.6)).toBe(8);
  });
});

describe("parseStoredSurfaceShift", () => {
  it("returns 0 for missing or invalid values", () => {
    expect(parseStoredSurfaceShift(null)).toBe(0);
    expect(parseStoredSurfaceShift("")).toBe(0);
    expect(parseStoredSurfaceShift("abc")).toBe(0);
  });

  it("parses and clamps stored integers", () => {
    expect(parseStoredSurfaceShift("-8")).toBe(-8);
    expect(parseStoredSurfaceShift("25")).toBe(SURFACE_SHIFT_MAX);
  });
});

describe("resolveSurfaceShift", () => {
  it("returns the dark shift in dark mode", () => {
    expect(resolveSurfaceShift("dark", -5, 10)).toBe(-5);
  });

  it("returns the light shift in light mode", () => {
    expect(resolveSurfaceShift("light", -5, 10)).toBe(10);
  });
});

describe("surfaceShiftCSSValue", () => {
  it("formats shift as a percentage CSS value", () => {
    expect(surfaceShiftCSSValue(4)).toBe("4%");
    expect(surfaceShiftCSSValue(-12)).toBe("-12%");
  });
});
