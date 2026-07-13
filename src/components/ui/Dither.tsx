import { cn } from "@/lib/utils";

type DitherVariant = "dot" | "bayer" | "hatch";
type DitherFade = "none" | "down" | "up" | "radial";
type DitherDensity = "dense" | "normal" | "sparse" | "coarse";

interface DitherProps {
  variant?: DitherVariant;
  fade?: DitherFade;
  density?: DitherDensity;
  accent?: boolean;
  strong?: boolean;
  animate?: boolean;
  /** When true (default), renders as an absolutely-positioned, aria-hidden texture layer. */
  layer?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const variantClass: Record<DitherVariant, string> = {
  dot: "dither",
  bayer: "dither dither--bayer",
  hatch: "dither dither--hatch",
};

const fadeClass: Record<DitherFade, string> = {
  none: "",
  down: "dither--fade",
  up: "dither--fade-up",
  radial: "dither--radial",
};

const densityClass: Record<DitherDensity, string> = {
  dense: "dither--dense",
  normal: "",
  sparse: "dither--sparse",
  coarse: "dither--coarse",
};

/**
 * Dither — the signature monochrome texture. Defaults to a full-bleed,
 * pointer-transparent background layer; set `layer={false}` to render inline.
 */
export function Dither({
  variant = "dot",
  fade = "none",
  density = "normal",
  accent = false,
  strong = false,
  animate = false,
  layer = true,
  className,
  style,
}: DitherProps) {
  return (
    <div
      aria-hidden
      className={cn(
        variantClass[variant],
        fadeClass[fade],
        densityClass[density],
        accent && "dither--accent",
        strong && "dither--strong",
        animate && "dither--animate",
        layer && "pointer-events-none absolute inset-0 -z-10",
        className,
      )}
      style={style}
    />
  );
}

interface DitherSparklineProps {
  data: number[];
  className?: string;
  height?: number;
  accent?: boolean;
}

/**
 * DitherSparkline — a compact bar chart whose columns are filled with the
 * dither texture (energy-dashboard style). Values are normalized to the max.
 */
export function DitherSparkline({ data, className, height = 40, accent = true }: DitherSparklineProps) {
  const max = Math.max(1, ...data);
  return (
    <div
      className={cn("flex items-end gap-[2px]", className)}
      style={{ height }}
      role="img"
      aria-label="sparkline"
    >
      {data.map((v, i) => (
        <div
          key={i}
          className={cn(
            "dither flex-1 rounded-[1px]",
            accent ? "dither--accent" : "dither--strong",
          )}
          style={{ height: `${Math.max(6, (v / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

interface DitherMeterProps {
  value: number; // 0..1
  className?: string;
  accent?: boolean;
}

/** DitherMeter — a horizontal progress bar with a dither-filled track. */
export function DitherMeter({ value, className, accent = true }: DitherMeterProps) {
  const pct = Math.min(100, Math.max(0, value * 100));
  return (
    <div
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-surface-2", className)}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn("dither h-full", accent ? "dither--accent" : "dither--strong")}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
