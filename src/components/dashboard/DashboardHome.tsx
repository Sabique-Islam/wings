import { Plus, Sparkles, ChevronRight } from "lucide-react";
import type { Entry } from "@/lib/journal";
import { computeDashboardStats } from "@/lib/dashboardStats";
import { asciiBox, toBlocks, toMeter } from "@/lib/ascii/art";
import { Ascii } from "@/lib/ascii";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface Props {
  entries: Entry[];
  roleMap: Record<string, string>;
  onSelect: (id: string) => void;
  onNew: () => void;
  onOpenAI: () => void;
}

function MetricCard({
  label,
  value,
  hint,
  tint,
}: {
  label: string;
  value: string;
  hint?: string;
  tint: "a" | "b" | "c" | "d";
}) {
  return (
    <div className={cn("nw-dash-metric", `nw-dash-metric--${tint}`)}>
      <p className="text-sm text-ink-1 font-sans">{label}</p>
      <p className="font-display font-bold text-2xl md:text-3xl text-ink-0 tabular-nums mt-2 tracking-tight">
        {value}
      </p>
      {hint && <p className="text-xs text-ink-2 mt-1">{hint}</p>}
    </div>
  );
}

function formatWords(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function firstName(email?: string | null): string {
  if (!email) return "there";
  const local = email.split("@")[0] || "there";
  const part = local.split(/[._-]/)[0];
  return part ? part.charAt(0).toUpperCase() + part.slice(1) : "there";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("default", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function DashboardHome({ entries, roleMap, onSelect, onNew, onOpenAI }: Props) {
  const { user } = useAuth();
  const stats = computeDashboardStats(entries, roleMap as any);
  const fillPct = Math.min(1, stats.pageCount / 50);
  const name = firstName(user?.email);

  const workspaceArt = asciiBox("workspace", [
    `  pages      ${String(stats.pageCount).padStart(6)}`,
    `  words      ${formatWords(stats.totalWords).padStart(6)}`,
    `  pinned     ${String(stats.pinnedCount).padStart(6)}`,
    `  shared     ${String(stats.sharedCount).padStart(6)}`,
    "",
    `  rhythm     ${toBlocks(stats.dailyActivity)}`,
    `  capacity   ${toMeter(fillPct, 18)}`,
  ]);

  const weekLine = stats.weekActivity
    .map((v, i) => `${["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"][i]}${v > 0 ? "●" : "○"}`)
    .join(" ");

  const activityArt = asciiBox("activity", [
    `  ${weekLine}`,
    "",
    "  pick a page below",
    "  or press ⌘N to write",
  ]);

  return (
    <div className="nw-dashboard-home min-h-full w-full bg-surface-0">
      <div className="max-w-[1040px] mx-auto px-6 md:px-10 py-8 md:py-10 space-y-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display font-bold text-2xl md:text-[1.75rem] text-ink-0 tracking-tight">
              Welcome back, {name}
            </h1>
            <p className="text-sm text-ink-2 mt-1 font-sans max-w-md">
              Your workspace at a glance — open a page from the sidebar or start something new.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onNew} className="nw-dash-btn nw-dash-btn--primary">
              <Plus className="h-4 w-4" /> New page
            </button>
            <button type="button" onClick={onOpenAI} className="nw-dash-btn">
              <Sparkles className="h-4 w-4" /> Ask AI
            </button>
          </div>
        </header>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Pages" value={String(stats.pageCount)} hint="in workspace" tint="a" />
          <MetricCard label="Words" value={formatWords(stats.totalWords)} hint="written" tint="b" />
          <MetricCard label="Pinned" value={String(stats.pinnedCount)} hint="favorites" tint="c" />
          <MetricCard label="Shared" value={String(stats.sharedCount)} hint="with you" tint="d" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-5 nw-dash-panel p-5 md:p-6">
            <Ascii size="text-[9px] sm:text-[10px]" className="text-ink-1 leading-[1.2]">
              {workspaceArt}
            </Ascii>
          </div>
          <div className="lg:col-span-7 nw-dash-panel p-5 md:p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-ink-0">Recent pages</h2>
              <span className="text-xs text-ink-2 font-sans">{stats.recent.length} shown</span>
            </div>
            {stats.recent.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-8 gap-3">
                <Ascii size="text-[10px]" className="text-ink-2/70">
                  {activityArt}
                </Ascii>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-1">
                <table className="nw-dash-table w-full text-left">
                  <thead>
                    <tr>
                      <th className="w-10">#</th>
                      <th>Title</th>
                      <th className="hidden sm:table-cell">Created</th>
                      <th className="text-right w-20">Words</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recent.map((p, i) => (
                      <tr key={p.id}>
                        <td className="font-mono text-ink-3 text-xs tabular-nums">
                          {String(i + 1).padStart(2, "0")}
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => onSelect(p.id)}
                            className="text-sm text-ink-0 hover:text-accent-strong text-left truncate max-w-[200px] sm:max-w-none block font-sans"
                          >
                            {p.title}
                          </button>
                        </td>
                        <td className="hidden sm:table-cell text-xs text-ink-2 font-sans">
                          {formatDate(p.date)}
                        </td>
                        <td className="text-right font-mono text-xs text-ink-2 tabular-nums">
                          {p.words}
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => onSelect(p.id)}
                            className="p-1 text-ink-3 hover:text-foreground rounded-md"
                            aria-label={`Open ${p.title}`}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
