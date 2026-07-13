import InfoPage from "./InfoPage";
import { SITE } from "@/config/site";

export function About() {
  return (
    <InfoPage eyebrow="company · about" title="what Wings is.">
      <p className="text-muted-foreground">
        {SITE.brand} is a web-based notes app: nested pages, a block editor, LaTeX math, Excalidraw drawings, and an AI panel that reads the page you have open. Pages can be shared by public link or email invite.
      </p>
      <p className="text-muted-foreground">
        It's built by a small team. The editor runs in the browser; your pages are stored in Supabase. AI calls go to whichever provider you configure — keys stay in your browser, not on our servers.
      </p>
      <h2 className="text-base font-mono uppercase tracking-tight pt-4">— how we build</h2>
      <ul className="list-none space-y-2 pl-0">
        <li className="text-muted-foreground">▸ ship real features before marketing them</li>
        <li className="text-muted-foreground">▸ keyboard shortcuts for common actions</li>
        <li className="text-muted-foreground">▸ markdown-compatible blocks, not a proprietary format</li>
        <li className="text-muted-foreground">▸ export your data as markdown or JSON</li>
      </ul>
    </InfoPage>
  );
}

export function Careers() {
  return (
    <InfoPage eyebrow="company · careers" title="not hiring right now.">
      <p className="text-muted-foreground">
        we don't have open roles at the moment. when we do, they'll be listed here.
      </p>
      <p className="text-muted-foreground pt-2">
        if you want to reach out anyway — {SITE.email}
      </p>
    </InfoPage>
  );
}

export function Blog() {
  return (
    <InfoPage eyebrow="company · blog" title="no posts yet.">
      <p className="text-muted-foreground">
        we'll publish write-ups about the editor, AI integration, and infrastructure here when we have something worth sharing.
      </p>
    </InfoPage>
  );
}

export function Contact() {
  return (
    <InfoPage eyebrow="company · contact" title="get in touch.">
      <p className="text-muted-foreground pt-2">
        one inbox for everything: bugs, account issues, security reports, and general questions.
      </p>
      <div className="border border-border/60 rounded-lg p-5 mt-4">
        <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">email</div>
        <a href={`mailto:${SITE.email}`} className="text-sm font-mono mt-2 block hover:underline">{SITE.email}</a>
      </div>
      <p className="text-xs text-muted-foreground pt-4">
        for security vulnerabilities, please include steps to reproduce. we aim to respond within a few business days.
      </p>
    </InfoPage>
  );
}

export function Roadmap() {
  const groups = [
    {
      h: "shipped",
      items: [
        "block editor with slash commands",
        "LaTeX math & Excalidraw",
        "AI panel + inline edits (⌘J)",
        "nested pages, pin, trash",
        "public share links & email invites",
        "draft cache + markdown/JSON export",
        "magic link & Google sign-in",
      ],
    },
    {
      h: "in progress",
      items: [
        "paid plans & hosted AI credits",
        "version history",
        "table of contents block",
      ],
    },
    {
      h: "exploring",
      items: [
        "real-time collaboration",
        "mobile app",
        "plugin API",
      ],
    },
  ];
  return (
    <InfoPage eyebrow="product · roadmap" title="what exists and what's next.">
      <p className="text-muted-foreground">
        this is an honest list — not a commitment. things move as we learn what people actually use.
      </p>
      <div className="grid md:grid-cols-3 gap-4 pt-4">
        {groups.map((g) => (
          <div key={g.h} className="border border-border/60 rounded-lg p-5">
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3">{g.h}</div>
            <ul className="space-y-2">
              {g.items.map((it) => <li key={it} className="text-sm font-mono text-muted-foreground">▸ {it}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </InfoPage>
  );
}

export function Docs() {
  return (
    <InfoPage eyebrow="resources · docs" title="keyboard shortcuts.">
      <p className="text-muted-foreground">
        these work in the editor. press ⌘? (or Ctrl+?) anywhere in the app to open the full shortcut list.
      </p>
      <h2 className="text-base font-mono uppercase tracking-tight pt-4">— navigation</h2>
      <div className="grid sm:grid-cols-2 gap-2 pt-2">
        {[
          ["⌘K", "command palette"],
          ["⌘N", "new page"],
          ["⌘P", "quick switcher"],
          ["⌘B", "toggle sidebar"],
          ["⌘/", "search sidebar"],
          ["⌘J", "AI panel"],
        ].map(([k, v]) => (
          <div key={k} className="flex items-center justify-between border border-border/60 rounded-md px-3 py-2">
            <span className="text-xs font-mono text-muted-foreground">{v}</span>
            <kbd className="text-xs font-mono bg-accent/40 rounded px-2 py-0.5">{k}</kbd>
          </div>
        ))}
      </div>
      <h2 className="text-base font-mono uppercase tracking-tight pt-6">— editing</h2>
      <div className="grid sm:grid-cols-2 gap-2 pt-2">
        {[
          ["/", "slash commands (type at line start)"],
          ["⌘B", "bold"],
          ["⌘I", "italic"],
          ["⌘E", "inline code"],
          ["⌘⇧S", "strikethrough"],
        ].map(([k, v]) => (
          <div key={k + v} className="flex items-center justify-between border border-border/60 rounded-md px-3 py-2">
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
    <InfoPage eyebrow="resources · support" title="need help?">
      <p className="text-muted-foreground">
        check the <a href="/docs" className="underline underline-offset-2 hover:text-foreground">docs</a> for keyboard shortcuts and basic usage.
      </p>
      <p className="text-muted-foreground pt-2">
        for account issues, bugs, or anything else — email <a href={`mailto:${SITE.email}`} className="underline underline-offset-2 hover:text-foreground">{SITE.email}</a>. we typically reply within a few business days.
      </p>
    </InfoPage>
  );
}

export function Status() {
  return (
    <InfoPage eyebrow="resources · status" title="no status page yet.">
      <p className="text-muted-foreground">
        we don't run a public uptime monitor. if something seems broken, email {SITE.email} and we'll look into it.
      </p>
      <p className="text-muted-foreground pt-2 text-sm">
        Wings depends on Supabase (auth + database) and your configured AI provider. outages there will affect sign-in, sync, or AI — not the local draft cache in your browser.
      </p>
    </InfoPage>
  );
}

export function Press() {
  return (
    <InfoPage eyebrow="resources · press" title="press inquiries.">
      <p className="text-muted-foreground">
        we don't have a press kit yet. for interviews or coverage questions, email {SITE.email} with your outlet and deadline.
      </p>
    </InfoPage>
  );
}
