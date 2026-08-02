import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { CornerFrame, StarFrame } from "@/components/ui/sharp";

export function DashboardSectionLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("text-[10px] font-mono uppercase tracking-[0.28em] text-ink-2", className)}>
      {children}
    </p>
  );
}

export function DashboardPanel({
  children,
  className,
  variant = "default",
  hover = false,
  padding = true,
}: {
  children: ReactNode;
  className?: string;
  variant?: "default" | "star" | "ghost";
  hover?: boolean;
  padding?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative",
        hover && "group",
        variant === "default" && "border border-dashed border-ink-2/45 bg-surface-0/30",
        variant === "ghost" && "border border-border-subtle/80 bg-transparent",
        variant === "star" && "border border-dashed border-ink-2/40 bg-surface-0/20 overflow-hidden",
        padding && "p-5 md:p-6",
        className,
      )}
    >
      {variant === "star" && <StarFrame />}
      {hover && (
        <CornerFrame
          variant="dashed"
          tone="muted"
          className="opacity-0 transition-opacity duration-150 group-hover:opacity-100"
        />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export function DashboardSharpButton({
  children,
  onClick,
  primary = false,
  className,
}: {
  children: ReactNode;
  onClick: () => void;
  primary?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative inline-flex items-center justify-center gap-2 px-5 py-2.5 text-[10px] font-mono uppercase tracking-[0.22em] transition-all active:scale-[0.98] overflow-visible",
        primary
          ? "bg-accent-strong text-accent-strong-foreground hover:gap-3"
          : "border border-border-strong bg-surface-0/50 text-foreground hover:bg-accent/25",
        className,
      )}
    >
      <CornerFrame
        variant="dashed"
        tone={primary ? "foreground" : "muted"}
        className="opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-active:opacity-100"
      />
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </button>
  );
}
