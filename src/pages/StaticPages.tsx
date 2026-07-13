import InfoPage from "./InfoPage";
import { SITE } from "@/config/site";

export function About() {
  return (
    <InfoPage eyebrow="company · about" title="we make a quiet place for loud ideas.">
      <p className="text-muted-foreground">{SITE.brand} started as a personal markdown journal. it grew into an editor, then a workspace, then an agent. through every step we kept one rule: no friction.</p>
      <p className="text-muted-foreground">we are a small team of writers and engineers who believe tools should disappear into the work.</p>
      <h2 className="text-base font-mono uppercase tracking-tight pt-4">— principles</h2>
      <ul className="list-none space-y-2 pl-0">
        <li className="text-muted-foreground">▸ keyboard before mouse</li>
        <li className="text-muted-foreground">▸ local before remote</li>
        <li className="text-muted-foreground">▸ markdown before everything</li>
        <li className="text-muted-foreground">▸ honesty before metrics</li>
      </ul>
    </InfoPage>
  );
}

export function Careers() {
  const roles = [
    { title: "senior product engineer", loc: "remote · global", type: "full-time" },
    { title: "design engineer", loc: "remote · americas", type: "full-time" },
    { title: "ai/ml engineer", loc: "remote · global", type: "full-time" },
    { title: "developer relations", loc: "remote · europe", type: "contract" },
  ];
  return (
    <InfoPage eyebrow="company · careers" title="build the editor you wish existed.">
      <p className="text-muted-foreground">we hire generalists who care about typography, latency, and end-user empathy. async-first. four-day workweek. equity for everyone.</p>
      <div className="space-y-2 pt-4">
        {roles.map((r) => (
          <div key={r.title} className="group border border-border/60 rounded-lg p-5 hover:bg-accent/30 transition-colors cursor-pointer">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-base font-mono tracking-tight">{r.title}</div>
                <div className="text-xs font-mono text-muted-foreground mt-1">{r.loc} · {r.type}</div>
              </div>
              <span className="text-xs font-mono text-muted-foreground group-hover:text-foreground transition-colors">apply →</span>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground pt-4">don't see a role? {SITE.email}</p>
    </InfoPage>
  );
}

export function Blog() {
  const posts = [
    { t: "rendering latex on every keystroke", d: "may 2026", x: "how we got pmatrix to compile in under 4ms." },
    { t: "the editor is the product", d: "apr 2026", x: "why every animation, every paste rule matters." },
    { t: "agentic notes, sanely", d: "mar 2026", x: "context, not chat. the difference matters." },
  ];
  return (
    <InfoPage eyebrow="company · blog" title="we write about the things we make.">
      <div className="space-y-1 pt-2">
        {posts.map((p) => (
          <div key={p.t} className="border-b border-border/60 py-5 group cursor-pointer">
            <div className="text-xs font-mono text-muted-foreground">{p.d}</div>
            <div className="text-xl font-mono tracking-tight mt-1 group-hover:text-foreground/70 transition-colors">{p.t}</div>
            <div className="text-sm text-muted-foreground mt-1">{p.x}</div>
          </div>
        ))}
      </div>
    </InfoPage>
  );
}

export function Contact() {
  return (
    <InfoPage eyebrow="company · contact" title="we read every email.">
      <div className="grid sm:grid-cols-2 gap-4 pt-2">
        {[
          { h: "general", v: SITE.email },
          { h: "support", v: SITE.email },
          { h: "security", v: SITE.email },
          { h: "press", v: SITE.email },
        ].map((c) => (
          <div key={c.h} className="border border-border/60 rounded-lg p-5">
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{c.h}</div>
            <div className="text-sm font-mono mt-2">{c.v}</div>
          </div>
        ))}
      </div>
    </InfoPage>
  );
}

export function Roadmap() {
  const groups = [
    { h: "shipping soon", items: ["graph view", "calendar pages", "table-of-contents block"] },
    { h: "in design", items: ["mobile native app", "inline ai citations", "shared workspaces"] },
    { h: "considering", items: ["voice transcription", "git sync", "plugin api"] },
  ];
  return (
    <InfoPage eyebrow="product · roadmap" title="where we're going.">
      <div className="grid md:grid-cols-3 gap-4 pt-2">
        {groups.map((g) => (
          <div key={g.h} className="border border-border/60 rounded-lg p-5">
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3">{g.h}</div>
            <ul className="space-y-2">
              {g.items.map((it) => <li key={it} className="text-sm font-mono">▸ {it}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </InfoPage>
  );
}

export function Docs() {
  return (
    <InfoPage eyebrow="resources · docs" title="learn the keyboard.">
      <h2 className="text-base font-mono uppercase tracking-tight">— shortcuts</h2>
      <div className="grid sm:grid-cols-2 gap-2 pt-2">
        {[
          ["⌘N", "new page"],
          ["⌘B", "toggle sidebar"],
          ["⌘P", "quick switcher"],
          ["⌘J", "agent panel"],
          ["⌘/", "search"],
          ["/", "slash commands"],
        ].map(([k, v]) => (
          <div key={k} className="flex items-center justify-between border border-border/60 rounded-md px-3 py-2">
            <span className="text-xs font-mono text-muted-foreground">{v}</span>
            <kbd className="text-xs font-mono bg-accent/40 rounded px-2 py-0.5">{k}</kbd>
          </div>
        ))}
      </div>
    </InfoPage>
  );
}

export function Support() {
  return (
    <InfoPage eyebrow="resources · support" title="we'll help.">
      <p className="text-muted-foreground">most answers live in the docs. if you can't find what you need, email {SITE.email} and we'll respond within one business day.</p>
    </InfoPage>
  );
}

export function Status() {
  const services = [
    { name: "api", s: "operational" },
    { name: "auth", s: "operational" },
    { name: "publishing", s: "operational" },
  ];
  return (
    <InfoPage eyebrow="resources · status" title="all systems nominal.">
      <div className="space-y-2 pt-2">
        {services.map((s) => (
          <div key={s.name} className="flex items-center justify-between border border-border-subtle rounded-md px-4 py-3">
            <span className="text-sm font-mono">{s.name}</span>
            <span className="text-xs font-mono text-accent-strong flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-strong animate-pulse" /> {s.s}
            </span>
          </div>
        ))}
      </div>
    </InfoPage>
  );
}

export function Press() {
  return (
    <InfoPage eyebrow="resources · press" title="press kit.">
      <p className="text-muted-foreground">brand assets, screenshots, and approved language for journalists and partners. email {SITE.email} to request the kit.</p>
    </InfoPage>
  );
}
