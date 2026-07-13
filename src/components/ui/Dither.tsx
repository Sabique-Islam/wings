import { cn } from "@/lib/utils";

type DitherVariant = "grain" | "bayer" | "hatch" | "dots";
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
  grain: "dither dither--grain",
  bayer: "dither dither--bayer",
  hatch: "dither dither--hatch",
  dots: "dither dither--dots",
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
 * Dither — stochastic printer grain (default) or ordered Bayer fills.
 * Grain uses SVG feTurbulence filters mounted via DitherFilterDefs.
 */
export function Dither({
  variant = "grain",
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

/** Bar chart columns filled with ordered Bayer dither. */
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
            "dither dither--bayer dither--dense flex-1 rounded-[1px]",
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

/** Horizontal progress bar with ordered Bayer fill. */
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
        className={cn("dither dither--bayer h-full", accent ? "dither--accent" : "dither--strong")}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
