import { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  clampSurfaceShift,
  DARK_SURFACE_SHIFT_KEY,
  LIGHT_SURFACE_SHIFT_KEY,
  parseStoredSurfaceShift,
  resolveSurfaceShift,
  surfaceShiftCSSValue,
} from "@/lib/themeSurfaceShift";

type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  accentColor: string;
  setAccentColor: (color: string) => void;
  darkSurfaceShift: number;
  lightSurfaceShift: number;
  setDarkSurfaceShift: (shift: number) => void;
  setLightSurfaceShift: (shift: number) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "system",
  resolvedTheme: "dark",
  setTheme: () => {},
  accentColor: "",
  setAccentColor: () => {},
  darkSurfaceShift: 0,
  lightSurfaceShift: 0,
  setDarkSurfaceShift: () => {},
  setLightSurfaceShift: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export function getSystemTheme(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function resolveTheme(theme: Theme): ResolvedTheme {
  return theme === "system" ? getSystemTheme() : theme;
}

function hexToHsl(hex: string): string | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

const ACCENT_PROPS = [
  "--accent-h",
  "--accent-s",
  "--accent-l",
  "--accent-strong-fg",
  "--ring",
  "--sidebar-primary",
  "--sidebar-primary-foreground",
  "--sidebar-ring",
];

function applyAccentColor(hex: string) {
  const root = document.documentElement;
  if (!hex) {
    // Clear inline overrides → CSS falls back to the monochrome channels.
    ACCENT_PROPS.forEach((p) => root.style.removeProperty(p));
    return;
  }
  const hsl = hexToHsl(hex);
  if (!hsl) return;
  const [h, s, lRaw] = hsl.split(" ");
  const l = parseInt(lRaw);
  // Auto-contrast foreground on top of the accent (WCAG-ish luminance split).
  const fg = l > 55 ? "0 0% 8%" : "0 0% 98%";

  // Split channels drive every derived accent token in index.css.
  root.style.setProperty("--accent-h", h);
  root.style.setProperty("--accent-s", s);
  root.style.setProperty("--accent-l", lRaw);
  root.style.setProperty("--accent-strong-fg", fg);
  // Focus ring + sidebar active adopt the accent hue directly.
  root.style.setProperty("--ring", hsl);
  root.style.setProperty("--sidebar-primary", hsl);
  root.style.setProperty("--sidebar-primary-foreground", fg);
  root.style.setProperty("--sidebar-ring", hsl);
}

export function applySurfaceShift(
  resolved: ResolvedTheme,
  darkShift: number,
  lightShift: number,
) {
  const shift = resolveSurfaceShift(resolved, darkShift, lightShift);
  document.documentElement.style.setProperty("--surface-l-shift", surfaceShiftCSSValue(shift));
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem("nw-theme") as Theme) || "system";
  });
  const [accentColor, setAccentColorState] = useState(() => {
    return localStorage.getItem("nw-accent") || "";
  });
  const [darkSurfaceShift, setDarkSurfaceShiftState] = useState(() => {
    return parseStoredSurfaceShift(localStorage.getItem(DARK_SURFACE_SHIFT_KEY));
  });
  const [lightSurfaceShift, setLightSurfaceShiftState] = useState(() => {
    return parseStoredSurfaceShift(localStorage.getItem(LIGHT_SURFACE_SHIFT_KEY));
  });
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolveTheme(
    (localStorage.getItem("nw-theme") as Theme) || "system",
  ));

  const applyTheme = useCallback((t: Theme, darkShift: number, lightShift: number) => {
    const resolved = resolveTheme(t);
    setResolvedTheme(resolved);
    // Theme lives in a single attribute; index.css owns the token values.
    document.documentElement.setAttribute("data-theme", resolved);
    applySurfaceShift(resolved, darkShift, lightShift);
    // Re-apply accent on top (accent is theme-independent).
    if (accentColor) applyAccentColor(accentColor);
  }, [accentColor]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem("nw-theme", t);
    applyTheme(t, darkSurfaceShift, lightSurfaceShift);
  }, [applyTheme, darkSurfaceShift, lightSurfaceShift]);

  const setAccentColor = useCallback((color: string) => {
    setAccentColorState(color);
    localStorage.setItem("nw-accent", color);
    applyAccentColor(color);
  }, []);

  const setDarkSurfaceShift = useCallback((shift: number) => {
    const clamped = clampSurfaceShift(shift);
    setDarkSurfaceShiftState(clamped);
    localStorage.setItem(DARK_SURFACE_SHIFT_KEY, String(clamped));
    applySurfaceShift(resolveTheme(theme), clamped, lightSurfaceShift);
  }, [theme, lightSurfaceShift]);

  const setLightSurfaceShift = useCallback((shift: number) => {
    const clamped = clampSurfaceShift(shift);
    setLightSurfaceShiftState(clamped);
    localStorage.setItem(LIGHT_SURFACE_SHIFT_KEY, String(clamped));
    applySurfaceShift(resolveTheme(theme), darkSurfaceShift, clamped);
  }, [theme, darkSurfaceShift]);

  useEffect(() => {
    applyTheme(theme, darkSurfaceShift, lightSurfaceShift);
  }, []);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system", darkSurfaceShift, lightSurfaceShift);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme, darkSurfaceShift, lightSurfaceShift, applyTheme]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        setTheme,
        accentColor,
        setAccentColor,
        darkSurfaceShift,
        lightSurfaceShift,
        setDarkSurfaceShift,
        setLightSurfaceShift,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
