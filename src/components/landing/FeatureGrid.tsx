import { motion } from "framer-motion";
import { fadeUp, motionEase } from "./constants";
import { Dither } from "@/components/ui/Dither";
import { AsciiSparkline } from "@/lib/ascii";
import { cn } from "@/lib/utils";

type Feature = {
  t: string;
  d: string;
  a: string;
  span: string;
  spark?: number[];
};

// Bento 3-2-3 rhythm across a 6-col grid.
const FEATURES: Feature[] = [
  { t: "block editor", d: "slash commands, markdown, latex, drawings — every line is a block you can drag and transform.", a: "/  →  table", span: "lg:col-span-3" },
  { t: "agentic ai", d: "summon ⌘J. it reads your open page and drafts the next paragraph, inline.", a: "⌘J", span: "lg:col-span-3", spark: [3, 5, 4, 7, 6, 9, 8, 12, 10, 14] },
  { t: "excalidraw inline", d: "sketch on any page. resize, persist, share.", a: "✎ canvas", span: "lg:col-span-2" },
  { t: "live latex", d: "type $$…$$ — pmatrix, implies, all of it.", a: "Σ live", span: "lg:col-span-2" },
  { t: "databases", d: "table, board, gallery — inline or full-page.", a: "▦ /table", span: "lg:col-span-2" },
  { t: "share & publish", d: "role-based access. public read links.", a: "↗ /s/", span: "lg:col-span-3" },
  { t: "offline first", d: "drafts cached locally. retries on reconnect.", a: "◉ local", span: "lg:col-span-3" },
];

export function FeatureGrid() {
  return (
    <section id="features" className="relative py-20 sm:py-28 md:py-32 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          variants={{ show: { transition: { staggerChildren: 0.08 } } }}
          className="space-y-2 mb-10 sm:mb-14"
        >
          <motion.div variants={fadeUp} transition={{ duration: 0.7, ease: motionEase }} className="text-[11px] font-mono uppercase tracking-[0.3em] text-ink-2">— features</motion.div>
          <motion.h2 variants={fadeUp} transition={{ duration: 0.7, ease: motionEase }} className="font-display font-bold text-3xl sm:text-4xl md:text-5xl tracking-tight leading-[1.05]">
            built for the way you<br className="hidden sm:block" /> actually think.
          </motion.h2>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.t}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.05, ease: motionEase }}
              className={cn(
                "group relative overflow-hidden rounded-xl border border-border-subtle bg-surface-1 p-6 sm:p-7 transition-colors hover:border-border-strong",
                f.span,
              )}
            >
              <Dither variant="dot" density="sparse" className="opacity-0 transition-opacity duration-slow group-hover:opacity-40" />
              <div className="relative flex h-full flex-col">
                <div className="font-mono text-[10px] text-ink-2 mb-5 sm:mb-6">0{i + 1} / 0{FEATURES.length}</div>
                <div className="font-display text-2xl sm:text-3xl tracking-tight mb-2">{f.t}</div>
                <div className="text-sm text-ink-1 font-sans leading-relaxed">{f.d}</div>
                {f.spark && (
                  <AsciiSparkline data={f.spark} accent className="mt-5 text-lg" />
                )}
                <div className="mt-auto pt-6 sm:pt-8">
                  <span className="inline-flex items-center gap-2 text-[10px] font-mono text-ink-2 border border-border-subtle rounded px-2 py-1">
                    {f.a}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
