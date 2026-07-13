import { motion } from "framer-motion";
import { motionEase } from "./constants";

export function HeroScreenshot() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1, ease: motionEase, delay: 0.35 }}
      className="relative mx-auto w-full max-w-5xl"
    >
      <div className="relative rounded-xl border border-border-subtle bg-card overflow-hidden shadow-2">
        <div className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 border-b border-border-subtle bg-surface-1">
          <span className="w-2.5 h-2.5 rounded-full bg-ink-3/60" />
          <span className="w-2.5 h-2.5 rounded-full bg-ink-3/40" />
          <span className="w-2.5 h-2.5 rounded-full bg-ink-3/25" />
          <span className="ml-3 text-[9px] sm:text-[10px] font-mono text-ink-2 truncate">wings.nopejs.me/n/today</span>
        </div>
        <div className="grid grid-cols-12 min-h-[300px] sm:min-h-[380px] md:min-h-[460px]">
          <aside className="col-span-3 border-r border-border-subtle p-3 space-y-2 hidden md:block bg-surface-0">
            <div className="text-[9px] uppercase tracking-widest text-ink-2">workspace</div>
            {["▸ inbox", "▸ research", "  ◦ topology", "  ◦ category", "▸ daily notes", "▸ archive"].map((t, i) => (
              <div key={i} className={`text-xs font-mono ${i === 2 ? "text-foreground bg-accent-soft rounded px-2 py-0.5" : "text-ink-2"}`}>{t}</div>
            ))}
          </aside>
          <main className="col-span-12 md:col-span-9 p-4 sm:p-6 md:p-8 space-y-3 bg-background">
            <div className="text-[10px] font-mono text-ink-2">▌ daily / 2026-05-06</div>
            <div className="text-xl sm:text-2xl md:text-3xl font-mono font-medium tracking-tight">topology lecture notes</div>
            <div className="space-y-2 pt-3">
              <div className="h-2 rounded bg-surface-2 w-11/12" />
              <div className="h-2 rounded bg-surface-2 w-10/12" />
              <div className="h-2 rounded bg-surface-2/70 w-7/12" />
              <div className="rounded-md border border-border-subtle p-3 mt-3 font-mono text-[10px] sm:text-xs text-ink-2 bg-surface-0 overflow-x-auto">
                $$\begin{`{pmatrix}`} 1 & 0 \\ 0 & 1 \end{`{pmatrix}`}$$
              </div>
              <div className="h-2 rounded bg-surface-2/70 w-9/12" />
              <div className="h-2 rounded bg-surface-2/70 w-6/12" />
            </div>
          </main>
        </div>
      </div>
    </motion.div>
  );
}
