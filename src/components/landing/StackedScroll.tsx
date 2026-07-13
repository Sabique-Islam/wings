import { motion } from "framer-motion";
import { motionEase } from "./constants";

const CARDS = [
  { tag: "writing", title: "blocks, not boxes.", body: "every paragraph is a block. drag, nest, transform. markdown shortcuts. latex inline. code with syntax." },
  { tag: "thinking", title: "an ai that reads with you.", body: "the agent has full context of the open page. ask, draft, refactor — without leaving the keyboard." },
  { tag: "sharing", title: "permissions that respect you.", body: "viewer, editor, admin. publish a page to the web with one click. revoke just as fast." },
];

export function StackedScroll() {
  return (
    <section id="showcase" className="relative">
      {CARDS.map((c, i) => (
        <div key={i} className="sticky top-0 min-h-screen flex items-center justify-center px-4 sm:px-6 py-16" style={{ zIndex: i + 1 }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ amount: 0.5 }}
            transition={{ duration: 0.8, ease: motionEase }}
            className="w-full max-w-5xl rounded-2xl border border-border-strong bg-surface-1/95 backdrop-blur-xl shadow-4 overflow-hidden"
            style={{ transform: `translateY(${i * 8}px)` }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="p-7 sm:p-10 md:p-14 space-y-4 sm:space-y-5">
                <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-accent-strong">{c.tag}</div>
                <div className="font-display font-bold text-3xl sm:text-4xl md:text-5xl tracking-tight leading-[1.05]">{c.title}</div>
                <div className="text-sm sm:text-base md:text-lg text-ink-1 font-sans leading-relaxed max-w-md">{c.body}</div>
              </div>
              <div className="relative bg-surface-0 border-t md:border-t-0 md:border-l border-border-subtle min-h-[200px] sm:min-h-[280px] flex items-center justify-center p-6 sm:p-8 font-mono text-xs text-ink-2 overflow-hidden">
                <div className="dither dither--grain absolute inset-0 opacity-50" aria-hidden />
                <pre className="relative z-10 leading-tight text-[10px] sm:text-[11px] opacity-80">{`┌──────────── ${c.tag} ────────────┐
│                                  │
│   ▌ ${c.title.slice(0, 22).padEnd(22, " ")}      │
│                                  │
│   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │
│   ░░░░░░░░░░░░░░░░░░░░░░░░       │
│   ░░░░░░░░░░░░░░░░░░░░░░░░░░     │
│                                  │
│            ◉  ◉  ◉              │
│                                  │
└──────────────────────────────────┘`}</pre>
              </div>
            </div>
          </motion.div>
        </div>
      ))}
    </section>
  );
}
