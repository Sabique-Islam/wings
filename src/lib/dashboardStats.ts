import type { Entry } from "@/lib/journal";
import { getEntryTitle, getPinnedEntries } from "@/lib/journal";

function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export interface DashboardStats {
  pageCount: number;
  totalWords: number;
  pinnedCount: number;
  sharedCount: number;
  /** Last 14 days — entry count per day (oldest first). */
  dailyActivity: number[];
  /** Mon–Sun of current week — edits/creations per day. */
  weekActivity: number[];
  recent: { id: string; title: string; words: number; date: string }[];
}

export function computeDashboardStats(
  entries: Entry[],
  roleMap: Record<string, "owner" | "admin" | "editor" | "viewer"> = {},
): DashboardStats {
  const active = entries.filter((e) => !e.deleted_at);
  const totalWords = active.reduce((n, e) => n + wordCount(e.content), 0);
  const sharedCount = active.filter((e) => roleMap[e.id] && roleMap[e.id] !== "owner").length;

  const now = new Date();
  const dailyActivity: number[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dailyActivity.push(
      active.filter((e) => e.created_at.slice(0, 10) === key).length,
    );
  }

  const weekActivity = [0, 0, 0, 0, 0, 0, 0];
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + mondayOffset + i);
    const key = d.toISOString().slice(0, 10);
    weekActivity[i] = active.filter((e) => e.created_at.slice(0, 10) === key).length;
  }

  const recent = [...active]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 6)
    .map((e) => ({
      id: e.id,
      title: getEntryTitle(e),
      words: wordCount(e.content),
      date: e.created_at,
    }));

  return {
    pageCount: active.length,
    totalWords,
    pinnedCount: getPinnedEntries(active).length,
    sharedCount,
    dailyActivity,
    weekActivity,
    recent,
  };
}

export interface ActivityPoint {
  label: string;
  count: number;
  date: string;
}

export interface WeekPoint {
  day: string;
  count: number;
  isToday: boolean;
}

/** Map 14-day activity array (oldest first) to chart rows with date labels. */
export function buildActivitySeries(dailyActivity: number[], now = new Date()): ActivityPoint[] {
  return dailyActivity.map((count, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (dailyActivity.length - 1 - i));
    const date = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("default", { month: "short", day: "numeric" });
    return { label, count, date };
  });
}

/** Map Mon–Sun activity to bar chart rows; flags today's column. */
export function buildWeekSeries(weekActivity: number[], now = new Date()): WeekPoint[] {
  const days = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
  const weekday = now.getDay();
  const todayIndex = weekday === 0 ? 6 : weekday - 1;
  return weekActivity.map((count, i) => ({
    day: days[i]!,
    count,
    isToday: i === todayIndex,
  }));
}

/** Dates (YYYY-MM-DD) when at least one page was created. */
export function buildActiveDates(entries: Entry[]): Set<string> {
  const dates = new Set<string>();
  for (const e of entries) {
    if (!e.deleted_at) dates.add(e.created_at.slice(0, 10));
  }
  return dates;
}

/** Percent change: last 7 days vs prior 7 days of page creations. */
export function activityTrend(dailyActivity: number[]): number | null {
  if (dailyActivity.length < 14) return null;
  const prior = dailyActivity.slice(0, 7).reduce((sum, n) => sum + n, 0);
  const recent = dailyActivity.slice(7).reduce((sum, n) => sum + n, 0);
  if (prior === 0) return recent > 0 ? 100 : 0;
  return ((recent - prior) / prior) * 100;
}
