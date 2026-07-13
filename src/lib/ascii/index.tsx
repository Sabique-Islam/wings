import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  EMPTY_BOX,
  SPINNER_FRAMES,
  WINGS_TAGLINE,
  WINGS_WORDMARK,
  toBlocks,
  toMeter,
} from "./art";

export * from "./art";

interface AsciiProps {
  children: React.ReactNode;
  className?: string;
  /** Tailwind text-size class; defaults to a small mono size. */
  size?: string;
}

/** Base primitive: a non-selectable monospace <pre>. */
export function Ascii({
  children,
  className,
  size = "text-[10px]",
  box = false,
}: AsciiProps & { box?: boolean }) {
  return (
    <pre
      className={cn(
        "font-mono select-none whitespace-pre",
        box ? "nw-ascii-box leading-[1.18] tracking-[0]" : "leading-tight",
        size,
        className,
      )}
    >
      {children}
    </pre>
  );
}

export function AsciiSpinner({ className }: { className?: string }) {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setFrame((f) => (f + 1) % SPINNER_FRAMES.length), 400);
    return () => clearInterval(t);
  }, []);
  return (
    <Ascii className={cn("text-ink-2", className)}>{SPINNER_FRAMES[frame]}</Ascii>
  );
}

export function WelcomeAscii({ className }: { className?: string }) {
  const art = `${WINGS_WORDMARK}       ${WINGS_TAGLINE}`;
  const [visible, setVisible] = useState(0);
  useEffect(() => {
    if (visible >= art.length) return;
    const t = setTimeout(() => setVisible((v) => Math.min(v + 3, art.length)), 12);
    return () => clearTimeout(t);
  }, [visible, art.length]);
  return (
    <Ascii size="text-[7px] sm:text-[9px]" className={cn("text-ink-2", className)}>
      {art.slice(0, visible)}
      <span className="animate-pulse">▌</span>
    </Ascii>
  );
}

export function EmptyStateAscii({ className }: { className?: string }) {
  return (
    <Ascii className={cn("text-ink-2/60 text-center", className)}>{EMPTY_BOX}</Ascii>
  );
}

/** ── · ── section divider; set `animate` for the flowing dot/dash effect. */
export function AsciiDivider({ animate = false, className }: { animate?: boolean; className?: string }) {
  if (animate) {
    return <div className={cn("nw-ascii-bar h-3", className)} aria-hidden />;
  }
  return (
    <div className={cn("font-mono text-[10px] text-ink-2/60 tracking-[0.3em] select-none", className)} aria-hidden>
      ── · ──
    </div>
  );
}

/** Box-drawing frame around arbitrary content. */
export function AsciiFrame({
  children,
  className,
  label,
}: {
  children: React.ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <div className={cn("relative rounded-md border border-border-subtle p-4 font-mono", className)}>
      {label && (
        <span className="absolute -top-2 left-3 bg-background px-1.5 text-[10px] uppercase tracking-widest text-ink-2">
          {label}
        </span>
      )}
      {children}
    </div>
  );
}

/** Block-character sparkline (e.g. ▂▃▅▇▆▄▂). */
export function AsciiSparkline({
  data,
  className,
  accent = false,
}: {
  data: number[];
  className?: string;
  accent?: boolean;
}) {
  return (
    <span
      className={cn("font-mono tracking-tight select-none", accent && "text-accent-strong", className)}
      role="img"
      aria-label="sparkline"
    >
      {toBlocks(data)}
    </span>
  );
}

/** Fixed-width ASCII meter (████████░░░░). */
export function AsciiMeter({
  value,
  width = 12,
  className,
  accent = false,
}: {
  value: number;
  width?: number;
  className?: string;
  accent?: boolean;
}) {
  return (
    <span className={cn("font-mono select-none", accent && "text-accent-strong", className)}>
      {toMeter(value, width)}
    </span>
  );
}

/**
 * Kinetic WINGS wordmark — the ASCII block-letter logo with an accent
 * underline stroke that draws itself in as the element scrolls into view.
 */
export function AsciiWordmark({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "center center"],
  });
  const pathLength = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <div ref={ref} className={cn("relative inline-block", className)}>
      <Ascii
        size="text-[6px] xs:text-[8px] sm:text-[11px] md:text-[13px]"
        className="text-ink-1"
      >
        {WINGS_WORDMARK}
      </Ascii>
      <svg
        className="pointer-events-none absolute -bottom-1 left-0 w-full"
        height="10"
        viewBox="0 0 300 10"
        preserveAspectRatio="none"
        aria-hidden
      >
        <motion.path
          d="M2 6 C 60 2, 120 9, 180 4 S 260 8, 298 5"
          fill="none"
          stroke="hsl(var(--accent-strong))"
          strokeWidth="2.5"
          strokeLinecap="round"
          style={{ pathLength }}
        />
      </svg>
    </div>
  );
}
