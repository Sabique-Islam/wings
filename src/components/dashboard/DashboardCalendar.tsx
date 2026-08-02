import { cn } from "@/lib/utils";
import { DashboardPanel, DashboardSectionLabel } from "@/components/dashboard/DashboardPanel";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildMonthGrid(now = new Date()) {
  const year = now.getFullYear();
  const month = now.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startOffset = first.getDay() === 0 ? 6 : first.getDay() - 1;
  const daysInMonth = last.getDate();

  const cells: { day: number | null; key: string; date: string | null }[] = [];
  for (let i = 0; i < startOffset; i++) {
    cells.push({ day: null, key: `pad-${i}`, date: null });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, key: date, date });
  }
  return {
    cells,
    monthLabel: first.toLocaleDateString("default", { month: "long", year: "numeric" }),
  };
}

export function DashboardCalendar({
  activeDates,
  now = new Date(),
  className,
}: {
  activeDates: Set<string>;
  now?: Date;
  className?: string;
}) {
  const todayKey = localDateKey(now);
  const { cells, monthLabel } = buildMonthGrid(now);

  return (
    <DashboardPanel hover={false} className={cn("h-full", className)}>
      <DashboardSectionLabel className="mb-4">{monthLabel}</DashboardSectionLabel>
      <div className="nw-dash-cal-grid">
        {WEEKDAYS.map((d) => (
          <span key={d} className="nw-dash-cal-weekday">
            {d}
          </span>
        ))}
        {cells.map((cell) => {
          if (cell.day === null) {
            return <span key={cell.key} className="nw-dash-cal-day nw-dash-cal-day--empty" aria-hidden />;
          }
          const active = cell.date ? activeDates.has(cell.date) : false;
          const isToday = cell.date === todayKey;
          return (
            <span
              key={cell.key}
              className={cn("nw-dash-cal-day", isToday && "nw-dash-cal-today")}
            >
              <span className="nw-dash-cal-inner">
                <span className="nw-dash-cal-num">{cell.day}</span>
                <span
                  className={cn("nw-dash-cal-dot", !active && "nw-dash-cal-dot--empty")}
                  aria-hidden={!active}
                />
              </span>
            </span>
          );
        })}
      </div>
      <p className="text-[10px] text-ink-3 mt-4 font-mono tracking-wide">● page created</p>
    </DashboardPanel>
  );
}
