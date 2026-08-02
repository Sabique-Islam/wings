import { cn } from "@/lib/utils";

export type CornerVariant = "dashed" | "solid";
export type CornerTone = "muted" | "accent" | "foreground";

const toneClass: Record<CornerTone, string> = {
  muted: "border-ink-2/60",
  accent: "border-accent-strong",
  foreground: "border-foreground/75",
};

/** Four corner brackets — dashed (hover) or solid (active). Theme-aware via accent token. */
export function CornerFrame({
  variant = "dashed",
  tone = "muted",
  className,
}: {
  variant?: CornerVariant;
  tone?: CornerTone;
  className?: string;
}) {
  const dash = variant === "dashed" ? "border-dashed" : "";
  const color = toneClass[tone];
  const corner = cn("absolute block size-5 sm:size-6", color, dash);

  return (
    <div className={cn("pointer-events-none absolute inset-0 z-30", className)} aria-hidden>
      <span className={cn(corner, "top-0 left-0 border-t border-l")} />
      <span className={cn(corner, "top-0 right-0 border-t border-r")} />
      <span className={cn(corner, "bottom-0 left-0 border-b border-l")} />
      <span className={cn(corner, "bottom-0 right-0 border-b border-r")} />
    </div>
  );
}

/** Star markers at corners — optional frame for cards and CTAs. */
export function StarFrame({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden border border-dashed border-ink-2/40",
        className,
      )}
      aria-hidden
    >
      <StarCorner className="absolute -top-[7.5px] -left-[7.5px]" />
      <StarCorner className="absolute -top-[7.5px] -right-[7.5px]" />
      <StarCorner className="absolute -bottom-[7.5px] -left-[7.5px]" />
      <StarCorner className="absolute -bottom-[7.5px] -right-[7.5px]" />
    </div>
  );
}

function StarCorner({ className }: { className?: string }) {
  return (
    <span className={cn("block size-4 text-ink-2/70", className)}>
      <svg viewBox="0 0 30 30" className="size-full" aria-hidden>
        <path
          fill="currentColor"
          d="M15 0 C19 9 21 11 30 15 C21 19 19 21 15 30 C11 21 9 19 0 15 C9 11 11 9 15 0 Z"
        />
      </svg>
    </span>
  );
}

/** Hover = dashed corners; active/selected = solid accent corners. */
export function SharpHighlight({
  active = false,
  className,
}: {
  active?: boolean;
  className?: string;
}) {
  return (
    <>
      <CornerFrame
        variant="dashed"
        tone="muted"
        className={cn(
          "opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-active:opacity-100",
          className,
        )}
      />
      {active && <CornerFrame variant="solid" tone="accent" />}
    </>
  );
}
