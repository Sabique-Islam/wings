import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import type { WeekPoint } from "@/lib/dashboardStats";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { DashboardPanel, DashboardSectionLabel } from "@/components/dashboard/DashboardPanel";

const chartConfig = {
  count: {
    label: "Pages",
    color: "hsl(var(--accent-strong))",
  },
};

export function DashboardWeekBars({ series, className }: { series: WeekPoint[]; className?: string }) {
  const total = series.reduce((sum, p) => sum + p.count, 0);

  return (
    <DashboardPanel hover={false} className={cn("nw-dash-chart h-full", className)}>
      <div className="nw-dash-chart-header">
        <div>
          <DashboardSectionLabel>This week</DashboardSectionLabel>
          <p className="font-display font-bold text-3xl text-ink-0 tabular-nums tracking-tight mt-1">
            {total}
          </p>
        </div>
      </div>
      <ChartContainer config={chartConfig} className="nw-dash-chart-area mt-5">
        <BarChart data={series} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="4 4" className="stroke-border/30" />
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
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
          <Bar dataKey="count" radius={[0, 0, 0, 0]} maxBarSize={28}>
            {series.map((point) => (
              <Cell
                key={point.day}
                fill={
                  point.isToday
                    ? "hsl(var(--accent-strong))"
                    : "hsl(var(--accent-strong) / 0.35)"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
      <p className="text-[10px] text-ink-3 mt-3 font-mono tracking-wide">mon–sun · pages</p>
    </DashboardPanel>
  );
}
