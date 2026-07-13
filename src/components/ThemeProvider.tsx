import { createContext, useContext, useEffect, useState, useCallback } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  accentColor: string;
  setAccentColor: (color: string) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "system",
  setTheme: () => {},
  accentColor: "",
  setAccentColor: () => {},
});

export const useTheme = () => useContext(ThemeContext);

function getSystemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
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

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem("nw-theme") as Theme) || "system";
  });
  const [accentColor, setAccentColorState] = useState(() => {
    return localStorage.getItem("nw-accent") || "";
  });

  const applyTheme = useCallback((t: Theme) => {
    const resolved = t === "system" ? getSystemTheme() : t;
    // Theme lives in a single attribute; index.css owns the token values.
    document.documentElement.setAttribute("data-theme", resolved);
    // Re-apply accent on top (accent is theme-independent).
    if (accentColor) applyAccentColor(accentColor);
  }, [accentColor]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem("nw-theme", t);
    applyTheme(t);
  }, [applyTheme]);

  const setAccentColor = useCallback((color: string) => {
    setAccentColorState(color);
    localStorage.setItem("nw-accent", color);
    applyAccentColor(color);
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, []);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme, applyTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, accentColor, setAccentColor }}>
      {children}
    </ThemeContext.Provider>
  );
}
