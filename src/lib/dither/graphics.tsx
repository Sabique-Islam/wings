import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type GraphicId = "compose" | "summon" | "publish" | "persist";

interface DitherGraphicProps {
  id: GraphicId;
  className?: string;
}

/**
 * 1-bit dithered illustrations for feature cards.
 * Black viewbox, white stippled shapes — matches reference aesthetic.
 */
export function DitherGraphic({ id, className }: DitherGraphicProps) {
  return (
    <svg
      viewBox="0 0 320 120"
      className={cn("w-full h-full", className)}
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="320" height="120" fill="#000" />
      {id === "compose" && <ComposeArt />}
      {id === "summon" && <SummonArt />}
      {id === "publish" && <PublishArt />}
      {id === "persist" && <PersistArt />}
    </svg>
  );
}

function Dithered({ children }: { children: ReactNode }) {
  return <g filter="url(#nw-dither-shape)">{children}</g>;
}

/** Overlapping rings — block editor / composition */
function ComposeArt() {
  return (
    <>
      <circle cx="118" cy="60" r="34" fill="none" stroke="#fff" strokeWidth="1.5" opacity="0.9" />
      <Dithered>
        <radialGradient id="compose-orb" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff" stopOpacity="1" />
          <stop offset="55%" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <circle cx="198" cy="60" r="30" fill="url(#compose-orb)" />
      </Dithered>
      <circle cx="198" cy="60" r="36" fill="none" stroke="#fff" strokeWidth="1" opacity="0.35" />
    </>
  );
}

/** Vertical bars — agentic AI / signal transform */
function SummonArt() {
  const bars = [18, 32, 24, 44, 36, 58, 42, 68, 52, 76, 48, 62];
  return (
    <Dithered>
      {bars.map((h, i) => {
        const x = 52 + i * 18;
        const y = 96 - h;
        return (
          <rect key={i} x={x} y={y} width="10" height={h} fill="#fff" opacity={0.35 + (h / 76) * 0.65} />
        );
      })}
    </Dithered>
  );
}

/** Layered arrows — share & publish / deploy */
function PublishArt() {
  return (
    <Dithered>
      <polygon points="72,60 108,36 108,84" fill="#fff" opacity="0.25" />
      <polygon points="112,60 148,36 148,84" fill="#fff" opacity="0.45" />
      <polygon points="152,60 188,36 188,84" fill="#fff" opacity="0.85" />
      <linearGradient id="publish-fade" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#fff" stopOpacity="0.15" />
        <stop offset="100%" stopColor="#fff" stopOpacity="0.9" />
      </linearGradient>
      <rect x="72" y="36" width="116" height="48" fill="url(#publish-fade)" opacity="0.5" />
    </Dithered>
  );
}

/** Ring with crossbars — offline / refine */
function PersistArt() {
  return (
    <>
      <Dithered>
        <radialGradient id="persist-ring" cx="50%" cy="50%" r="50%">
          <stop offset="68%" stopColor="#fff" stopOpacity="0" />
          <stop offset="78%" stopColor="#fff" stopOpacity="0.9" />
          <stop offset="88%" stopColor="#fff" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <circle cx="160" cy="60" r="38" fill="url(#persist-ring)" />
        <rect x="48" y="56" width="56" height="8" fill="#fff" opacity="0.7" />
        <rect x="216" y="56" width="56" height="8" fill="#fff" opacity="0.7" />
        <rect x="156" y="28" width="8" height="20" fill="#fff" opacity="0.45" />
        <rect x="156" y="72" width="8" height="20" fill="#fff" opacity="0.45" />
      </Dithered>
      <circle cx="160" cy="60" r="38" fill="none" stroke="#fff" strokeWidth="1" opacity="0.5" />
    </>
  );
}

export const DITHER_GRAPHIC_MAP: Record<string, GraphicId> = {
  "block editor": "compose",
  "agentic ai": "summon",
  "share & publish": "publish",
  "offline first": "persist",
};
