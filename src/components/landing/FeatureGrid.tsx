import { motion } from "framer-motion";
import { fadeUp, motionEase } from "./constants";
import { DitherGraphic, DITHER_GRAPHIC_MAP } from "@/lib/dither/graphics";
import { cn } from "@/lib/utils";

type ShowcaseFeature = {
  t: string;
  headline: string;
  d: string;
  tag: string;
  graphic: keyof typeof DITHER_GRAPHIC_MAP;
};

const SHOWCASE: ShowcaseFeature[] = [
  {
    t: "compose",
    headline: "block editor",
    d: "headings, lists, tasks, tables, code, callouts, toggles, and two-column layouts. type / for slash commands or use markdown shortcuts.",
    tag: "/  →  table",
    graphic: "block editor",
  },
  {
    t: "summon",
    headline: "ai panel",
    d: "press ⌘J to open the assistant. it sees the active page, can append or replace text, create a new page, or run inline edits on a selection. connect your own provider key in settings.",
    tag: "⌘J",
    graphic: "agentic ai",
  },
  {
    t: "publish",
    headline: "share pages",
    d: "create a public read link at /s/…, or invite someone by email as viewer, editor, or admin. revoke access any time.",
    tag: "↗ /s/",
    graphic: "share & publish",
  },
  {
    t: "persist",
    headline: "draft cache",
    d: "unsaved edits are stored in your browser. if the network drops, Wings retries the write when you reconnect. export any page as markdown or JSON.",
    tag: "◉ local",
    graphic: "offline first",
  },
];

type CompactFeature = { t: string; d: string; a: string };

const MORE: CompactFeature[] = [
  { t: "excalidraw", d: "insert a drawing block on any page or open the full canvas modal. scenes are saved with the page.", a: "✎ canvas" },
  { t: "latex math", d: "inline $…$ or block $$…$$. matrices, fractions, and symbols render as you type.", a: "Σ math" },
  { t: "keyboard", d: "⌘K command palette, ⌘N new page, ⌘P quick switcher, ⌘B sidebar, ⌘/ sidebar search.", a: "⌘K" },
];

export function FeatureGrid() {
  return (
    <section className="relative py-20 sm:py-28 md:py-32 px-4 sm:px-6">
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
            what the app<br className="hidden sm:block" /> does today.
          </motion.h2>
        </motion.div>

        {/* 2×2 reference-style cards with dithered black viewboxes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 mb-4 sm:mb-5">
          {SHOWCASE.map((f, i) => (
            <motion.article
              key={f.t}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: motionEase }}
              className="group relative flex flex-col rounded-xl border border-border-subtle bg-card p-6 sm:p-8 transition-colors hover:border-border-strong"
            >
              <div className="flex items-start justify-between gap-4 mb-6">
                <h3 className="font-display text-2xl sm:text-3xl tracking-tight capitalize">{f.t}</h3>
                <span className="font-display text-4xl sm:text-5xl font-bold text-transparent [-webkit-text-stroke:1px_hsl(var(--fg-3))] tabular-nums leading-none">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>

              <div className="dither-viewbox relative aspect-[8/3] w-full rounded-sm mb-6">
                <DitherGraphic id={DITHER_GRAPHIC_MAP[f.graphic]} />
              </div>

              <div className="flex-1 space-y-3">
                <h4 className="font-display text-lg sm:text-xl font-semibold tracking-tight">{f.headline}</h4>
                <p className="text-sm text-ink-1 font-sans leading-relaxed">{f.d}</p>
              </div>

              <div className="mt-6 flex items-end justify-between gap-4">
                <span className="inline-flex items-center gap-2 text-[10px] font-mono text-ink-2 border border-border-subtle rounded px-2 py-1">
                  {f.tag}
                </span>
                <span className="text-[10px] font-mono text-ink-3 uppercase tracking-widest">wings</span>
              </div>
            </motion.article>
          ))}
        </div>

        {/* Compact row for remaining features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {MORE.map((f, i) => (
            <motion.div
              key={f.t}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.06, ease: motionEase }}
              className={cn(
                "rounded-xl border border-border-subtle bg-surface-1 p-5 sm:p-6 transition-colors hover:border-border-strong",
              )}
            >
              <div className="font-display text-lg tracking-tight mb-1.5">{f.t}</div>
              <p className="text-sm text-ink-1 font-sans leading-relaxed mb-4">{f.d}</p>
              <span className="text-[10px] font-mono text-ink-2 border border-border-subtle rounded px-2 py-1">{f.a}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
