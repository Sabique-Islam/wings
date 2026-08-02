import { cn } from "@/lib/utils";
import { DashboardPanel, DashboardSectionLabel } from "@/components/dashboard/DashboardPanel";

function Ring({
  label,
  value,
  pct,
  tint,
}: {
  label: string;
  value: string;
  pct: number;
  tint: "a" | "b" | "c";
}) {
  const clamped = Math.min(100, Math.max(0, pct));
  const r = 26;
  const c = 2 * Math.PI * r;
  const offset = c - (clamped / 100) * c;

  return (
    <div className={cn("relative flex flex-col items-center py-2", `nw-dash-ring--${tint}`)}>
      <div className="relative size-20">
        <svg viewBox="0 0 72 72" className="absolute inset-0 size-full" aria-hidden>
          <circle cx="36" cy="36" r={r} className="nw-dash-ring-track" />
          <circle
            cx="36"
            cy="36"
            r={r}
            className="nw-dash-ring-fill"
            strokeDasharray={c}
            strokeDashoffset={offset}
            transform="rotate(-90 36 36)"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 pointer-events-none">
          <span className="font-display font-bold text-sm text-ink-0 tabular-nums leading-none">{value}</span>
          <span className="text-[8px] text-ink-2 font-mono uppercase tracking-wider text-center leading-tight px-1">
            {label}
          </span>
        </div>
      </div>
    </div>
  );
}

export function DashboardRhythm({
  activeDays,
  pinnedCount,
  pageCount,
  capacityPct,
  className,
}: {
  activeDays: number;
  pinnedCount: number;
  pageCount: number;
  capacityPct: number;
  className?: string;
}) {
  const pinnedPct = pageCount > 0 ? (pinnedCount / pageCount) * 100 : 0;
  const weekPct = (activeDays / 7) * 100;

  return (
    <DashboardPanel hover={false} className={cn("h-full", className)}>
      <DashboardSectionLabel className="mb-5">Writing rhythm</DashboardSectionLabel>
      <div className="grid grid-cols-3 gap-2 divide-x divide-dashed divide-ink-2/30">
        <Ring label="Active" value={`${activeDays}/7`} pct={weekPct} tint="a" />
        <Ring label="Pinned" value={String(pinnedCount)} pct={pinnedPct} tint="b" />
        <Ring label="Cap" value={`${Math.round(capacityPct * 100)}%`} pct={capacityPct * 100} tint="c" />
      </div>
      <p className="text-[10px] text-ink-3 mt-5 font-mono tracking-wide border-t border-dashed border-ink-2/30 pt-4">
        ~50 pages · workspace capacity
      </p>
    </DashboardPanel>
  );
}
