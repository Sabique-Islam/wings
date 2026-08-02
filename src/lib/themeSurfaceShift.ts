export const SURFACE_SHIFT_MIN = -20;
export const SURFACE_SHIFT_MAX = 20;

export const DARK_SURFACE_SHIFT_KEY = "nw-dark-surface-shift";
export const LIGHT_SURFACE_SHIFT_KEY = "nw-light-surface-shift";

export function clampSurfaceShift(value: number): number {
  return Math.min(SURFACE_SHIFT_MAX, Math.max(SURFACE_SHIFT_MIN, Math.round(value)));
}

export function parseStoredSurfaceShift(raw: string | null): number {
  if (raw == null || raw === "") return 0;
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n)) return 0;
  return clampSurfaceShift(n);
}

export function resolveSurfaceShift(
  resolvedTheme: "light" | "dark",
  darkShift: number,
  lightShift: number,
): number {
  return resolvedTheme === "dark" ? darkShift : lightShift;
}

export function surfaceShiftCSSValue(shift: number): string {
  return `${clampSurfaceShift(shift)}%`;
}
