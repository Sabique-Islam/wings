# Beginner's Guide to the Wings Codebase

Welcome! This guide explains Wings in plain language — what it is, how pieces connect, and where to look when you want to change something. No prior TipTap or Supabase experience required.

## What is Wings?

Wings is a **Notion-style journal**: nested pages, a rich block editor, sharing, optional realtime collaboration, and an AI assistant (bring your own API key).

Users write in a block editor (like Notion or Google Docs). Content is saved to **Supabase** (PostgreSQL + auth + storage). The app runs as a **React single-page app** built with **Vite**.

## The big picture

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (React + TipTap editor)                            │
│  localhost:8080 / wings.nopejs.me                           │
└───────────────┬─────────────────────────────┬─────────────────┘
                │                             │
                ▼                             ▼
        ┌───────────────┐             ┌───────────────┐
        │   Supabase    │             │ Collab server │
        │  Postgres +   │             │  (optional)   │
        │  Auth + Storage│            │  WebSocket    │
        └───────────────┘             └───────────────┘
```

- **Solo editing:** you type → app autosaves markdown + JSON to Supabase.
- **Shared editing (optional):** multiple users connect through the collab server; Yjs syncs the document in realtime.

## Key technologies (what they do here)

| Technology | Role in Wings |
|------------|---------------|
| **React** | UI components, pages, state |
| **TypeScript** | Type-safe JavaScript throughout |
| **Vite** | Dev server and production bundler |
| **TipTap / ProseMirror** | The block editor engine |
| **Tailwind + shadcn/Radix** | Styling and accessible UI primitives |
| **Supabase** | Database, login, file storage, serverless functions |
| **Yjs + Hocuspocus** | Realtime collaboration (optional) |
| **Vitest** | Fast unit tests (including editor logic in jsdom) |
| **Playwright** | Browser tests that simulate real typing and clicks |
| **Bun** | Package manager and test runner in CI |

You do not need to master all of these on day one. Pick the area you are changing and learn that slice first.

## Repository tour

```
wings/
├── src/                      ← Most frontend code lives here
│   ├── pages/                ← Full-screen routes (journal home, login, …)
│   ├── components/
│   │   └── BlockEditor/      ← Editor extensions, menus, keyboard handling
│   ├── lib/                  ← Business logic (save, load, markdown, drafts)
│   ├── hooks/                ← React hooks (auth, etc.)
│   └── integrations/supabase/← Database client
├── supabase/
│   ├── migrations/           ← Database schema (SQL files, run in order)
│   └── functions/            ← Server-side code (email, link previews, …)
├── collab/                   ← Separate Node server for realtime editing
├── tests/                    ← Playwright end-to-end tests
├── scripts/                  ← Maintenance scripts (entry recovery)
└── .github/                  ← Contributing docs and CI workflows
```

**Import shortcut:** `@/` means `src/`. Example: `import { x } from '@/lib/journal'`.

## How a page load works (simplified)

1. User opens a journal entry URL.
2. App fetches entry row from Supabase (`content`, `content_json`, metadata).
3. **`resolveInitialEditorContent`** picks what to show in the editor — markdown vs JSON. Empty JSON must **not** hide real markdown (this invariant prevented a past data-loss incident).
4. TipTap renders blocks in the editor.
5. Offline drafts in IndexedDB may apply if newer than server — guarded by **`shouldApplyDraft`**.

## How saving works (simplified)

1. User types; editor debounces changes.
2. Content serializes to markdown + TipTap JSON.
3. **`shouldBlockEmptySave`** prevents saving empty content over substantial existing content.
4. Update sent to Supabase; local draft cache updated.
5. If collab is active, Yjs state may also persist to `content_yjs`.

**If you touch save or load logic, read [wings-data-safety](https://github.com/Sabique-Islam/wings/blob/master/.cursor/skills/wings-data-safety/SKILL.md) first.**

## The block editor (`src/components/BlockEditor/`)

TipTap is built from **extensions** — small plugins that add nodes (headings, callouts, code blocks), marks (bold, link), and behavior (slash menu, Enter key handling).

Important files:

| File / area | Purpose |
|-------------|---------|
| `editorExtensions.ts` | Lists all extensions; order matters |
| `BlockEditor.tsx` | Main editor React component |
| `WritingExperience.ts` | Keyboard priority and writing flow |
| `SlashCommand/` | `/` menu for inserting blocks |
| `PageMention/` | `@` menu for linking pages |

Adding a new block type usually means: create an extension file → register in `editorExtensions.ts` → add tests → add Playwright coverage if keyboard-related.

## The journal app shell (`src/pages/`, `src/lib/journal.ts`)

Outside the editor:

- **Sidebar** — page tree, navigation
- **Index page** — main writing surface
- **Share menu** — invite collaborators, generate links
- **Command palette** — quick actions

`src/lib/journal.ts` and related files handle CRUD for entries, workspace sync, and properties.

## Database (`supabase/migrations/`)

Schema changes are **new SQL files** with timestamps — never edit old migrations.

Typical contents:

- Tables (`entries`, shares, profiles, …)
- Row Level Security (RLS) — who can read/write which rows
- RPC functions — complex queries callable from the client

## Tests — two layers

### Unit tests (`bun run test:editor`)

Run in Node with a fake DOM. Good for:

- Markdown round-trip
- Save/load guard functions
- Extension registration (e.g. Link registered exactly once)

Not good for: simulating Enter key in a real browser — use Playwright for that.

### E2E tests (`bun run test:e2e`)

Real Chromium browser. Tests typing, Enter, slash menu, wikilinks, etc.

Dev harness: [http://localhost:8080/__editor-e2e](http://localhost:8080/__editor-e2e)

## Common tasks — where to start

| I want to… | Start here |
|------------|------------|
| Fix editor keyboard behavior | `BlockEditor/`, then `tests/editor-*.spec.ts` |
| Fix content not saving | `src/lib/editorContent.ts`, `draftCache.ts`, `Index.tsx` |
| Add a new page/route | `src/pages/`, `src/App.tsx` |
| Change login / auth | `src/pages/Auth`, [wings-auth-routing skill](https://github.com/Sabique-Islam/wings/blob/master/.cursor/skills/wings-auth-routing/SKILL.md) |
| Add a DB column | New file in `supabase/migrations/` |
| Fix sharing permissions | `ShareMenu`, `supabase/migrations/` RLS policies |
| Add AI feature | `src/lib/ai/`, `AIAssistant` components |

## Data safety — read this early

In 2026, users lost content due to save/load edge cases. The project now enforces strict rules:

- Never persist empty content over meaningful existing content.
- Never prefer empty JSON over markdown on load.
- Never DELETE entry content in migrations without explicit approval.

Before any PR touching editor or persistence: run `bun run test:editor && bun run test:e2e`.

## Skills and agent docs

Detailed runbooks live in [`.cursor/skills/`](https://github.com/Sabique-Islam/wings/tree/master/.cursor/skills) — useful for humans too:

| Skill | Topic |
|-------|-------|
| [wings-project](https://github.com/Sabique-Islam/wings/blob/master/.cursor/skills/wings-project/SKILL.md) | Repo layout and commands |
| [wings-block-editor](https://github.com/Sabique-Islam/wings/blob/master/.cursor/skills/wings-block-editor/SKILL.md) | TipTap architecture |
| [wings-data-safety](https://github.com/Sabique-Islam/wings/blob/master/.cursor/skills/wings-data-safety/SKILL.md) | Save/load invariants |
| [wings-ship-gate](https://github.com/Sabique-Islam/wings/blob/master/.cursor/skills/wings-ship-gate/SKILL.md) | Pre-merge checklist |
| [wings-supabase](https://github.com/Sabique-Islam/wings/blob/master/.cursor/skills/wings-supabase/SKILL.md) | Migrations and RLS |
| [wings-testing](https://github.com/Sabique-Islam/wings/blob/master/.cursor/skills/wings-testing/SKILL.md) | Vitest and Playwright patterns |

## Suggested first contribution path

1. Complete [LOCAL_SETUP.md](https://github.com/Sabique-Islam/wings/blob/master/.github/LOCAL_SETUP.md).
2. Run the app and create a test page.
3. Run `bun run test:editor` and `bun run test:e2e` to see tests pass.
4. Create a branch: `your-github-username/type/short-desc` (e.g. `alex/fix/typo-in-readme`).
5. Pick a small issue labeled `good first issue` (or docs typo).
6. Make the change, add a test if applicable.
7. Open a PR using a [PR template](https://github.com/Sabique-Islam/wings/tree/master/.github/PULL_REQUEST_TEMPLATE) (`?template=editor.md`, etc.).
8. Use [COMMIT_CONVENTION.md](https://github.com/Sabique-Islam/wings/blob/master/.github/COMMIT_CONVENTION.md) for commit messages.

## Glossary

| Term | Meaning |
|------|---------|
| **Entry** | A journal page (row in `entries` table) |
| **Block** | One unit in the editor (paragraph, heading, callout, …) |
| **Extension** | TipTap plugin adding schema or behavior |
| **RLS** | Row Level Security — Postgres rules for who sees which rows |
| **Yjs** | CRDT library for merging concurrent edits |
| **BYOK** | Bring Your Own Key — user supplies their AI API key |
| **Markdown round-trip** | Write markdown ↔ edit in TipTap ↔ export same markdown |

## Questions?

- [CONTRIBUTING.md](https://github.com/Sabique-Islam/wings/blob/master/.github/CONTRIBUTING.md) — workflow and expectations
- [GitHub Discussions](https://github.com/Sabique-Islam/wings/discussions) — ask anything
- Comment on your PR — maintainers are happy to point you to the right file

Happy hacking!
