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
