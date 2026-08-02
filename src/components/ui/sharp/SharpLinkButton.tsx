import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { CornerFrame } from "./CornerFrame";

type Props = {
  to: string;
  children: React.ReactNode;
  className?: string;
  variant?: "primary" | "ghost";
};

/** Landing CTA with corner brackets on hover. */
export function SharpLinkButton({ to, children, className, variant = "ghost" }: Props) {
  return (
    <Link
      to={to}
      className={cn(
        "group relative inline-flex items-center justify-center gap-2 px-6 py-3 text-[11px] font-mono uppercase tracking-[0.2em] transition-colors overflow-visible touch-manipulation active:scale-[0.98]",
        variant === "primary" &&
          "bg-accent-strong text-accent-strong-foreground hover:gap-3",
        variant === "ghost" &&
          "border border-border-strong bg-surface-1/40 text-foreground hover:bg-accent/30",
        className,
      )}
    >
      <CornerFrame
        variant="dashed"
        tone="muted"
        className="opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-active:opacity-100"
      />
      {children}
    </Link>
  );
}
