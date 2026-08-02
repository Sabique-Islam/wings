import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import type { ActivityPoint } from "@/lib/dashboardStats";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { DashboardPanel, DashboardSectionLabel } from "@/components/dashboard/DashboardPanel";

const chartConfig = {
  count: {
    label: "Pages created",
    color: "hsl(var(--accent-strong))",
  },
};

function formatTrend(trend: number | null): { label: string; positive: boolean } | null {
  if (trend === null) return null;
  const positive = trend >= 0;
  const label = `${positive ? "+" : ""}${trend.toFixed(1)}%`;
  return { label, positive };
}

export function DashboardActivityLine({
  series,
  trend,
  className,
}: {
  series: ActivityPoint[];
  trend: number | null;
  className?: string;
}) {
  const total = series.reduce((sum, p) => sum + p.count, 0);
  const trendBadge = formatTrend(trend);

  return (
    <DashboardPanel hover={false} className={cn("nw-dash-chart h-full", className)}>
      <div className="nw-dash-chart-header">
        <div>
          <DashboardSectionLabel>Pages created</DashboardSectionLabel>
          <p className="font-display font-bold text-3xl text-ink-0 tabular-nums tracking-tight mt-1">
            {total}
          </p>
        </div>
        {trendBadge && (
          <span
            className={cn(
              "nw-dash-trend",
              trendBadge.positive ? "nw-dash-trend--up" : "nw-dash-trend--down",
            )}
          >
            {trendBadge.label}
          </span>
        )}
      </div>
      <ChartContainer config={chartConfig} className="nw-dash-chart-area mt-5">
        <AreaChart data={series} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="dashActivityFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--accent-strong))" stopOpacity={0.4} />
              <stop offset="100%" stopColor="hsl(var(--accent-strong))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="4 4" className="stroke-border/30" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
            width={28}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Area
            type="monotone"
            dataKey="count"
            stroke="hsl(var(--accent-strong))"
            strokeWidth={1.5}
            fill="url(#dashActivityFill)"
            dot={false}
            activeDot={{ r: 3, fill: "hsl(var(--accent-strong))" }}
          />
        </AreaChart>
      </ChartContainer>
      <p className="text-[10px] text-ink-3 mt-3 font-mono tracking-wide">14d · new pages</p>
    </DashboardPanel>
  );
}
