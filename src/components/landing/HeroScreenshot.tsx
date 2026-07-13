import { motion } from "framer-motion";
import { motionEase } from "./constants";

export function HeroScreenshot() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 60, rotateX: 8 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 1.2, ease: motionEase, delay: 0.4 }}
      className="relative mx-auto w-full max-w-5xl"
      style={{ perspective: 1200 }}
    >
      <div className="absolute -inset-x-4 sm:-inset-x-10 -inset-y-6 bg-gradient-to-b from-foreground/5 to-transparent blur-3xl pointer-events-none" />
      <div className="relative rounded-xl border border-border/80 bg-card/80 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] overflow-hidden">
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.08]" preserveAspectRatio="none">
          <defs>
            <pattern id="sketch" width="6" height="6" patternUnits="userSpaceOnUse">
              <path d="M0 6 L6 0" stroke="currentColor" strokeWidth="0.4" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#sketch)" />
        </svg>
        <div className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 border-b border-border/60 bg-background/60">
          <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/40" />
          <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30" />
          <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/20" />
          <span className="ml-3 text-[9px] sm:text-[10px] font-mono text-muted-foreground truncate">wings.nopejs.me/n/today</span>
        </div>
        <div className="grid grid-cols-12 min-h-[300px] sm:min-h-[380px] md:min-h-[460px]">
          <aside className="col-span-3 border-r border-border/60 p-3 space-y-2 hidden md:block">
            <div className="text-[9px] uppercase tracking-widest text-muted-foreground">workspace</div>
            {["▸ inbox", "▸ research", "  ◦ topology", "  ◦ category", "▸ daily notes", "▸ archive"].map((t, i) => (
              <div key={i} className={`text-xs font-mono ${i === 2 ? "text-foreground bg-accent/40 rounded px-2 py-0.5" : "text-muted-foreground"}`}>{t}</div>
            ))}
          </aside>
          <main className="col-span-12 md:col-span-9 p-4 sm:p-6 md:p-8 space-y-3">
            <div className="text-[10px] font-mono text-muted-foreground">▌ daily / 2026-05-06</div>
            <div className="text-xl sm:text-2xl md:text-3xl font-mono font-medium tracking-tight">notes that don't get in the way.</div>
            <div className="space-y-2 pt-3">
              <div className="h-2 rounded bg-muted/60 w-11/12" />
              <div className="h-2 rounded bg-muted/60 w-10/12" />
              <div className="h-2 rounded bg-muted/40 w-7/12" />
              <div className="rounded-md border border-border/60 p-3 mt-3 font-mono text-[10px] sm:text-xs text-muted-foreground bg-background/40 overflow-x-auto">
                $$\begin{`{pmatrix}`} 1 & 0 \\ 0 & 1 \end{`{pmatrix}`}$$
              </div>
              <div className="h-2 rounded bg-muted/40 w-9/12" />
              <div className="h-2 rounded bg-muted/40 w-6/12" />
            </div>
          </main>
        </div>
      </div>
    </motion.div>
  );
}
