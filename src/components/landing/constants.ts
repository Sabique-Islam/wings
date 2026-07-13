export const motionEase = [0.22, 1, 0.36, 1] as const;

export const fadeUp = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } };

// ASCII art now lives in @/lib/ascii — re-export for existing landing imports.
export { WINGS_WORDMARK as heroAscii, WINGS_MARK_COMPACT as HERO_ASCII_COMPACT } from "@/lib/ascii/art";
