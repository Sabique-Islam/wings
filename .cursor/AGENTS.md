# Wings — Agent Guide

Notion-style block journal. **User data loss occurred in 2026 — treat every editor/save change as production-critical.**

## Start here

| Situation | Read first |
|-----------|------------|
| Any PR | **wings-ship-gate** |
| Editor / TipTap | **wings-block-editor** + extension-checklist |
| Save / load / drafts | **wings-data-safety** + incident-postmortem |
| User says data missing | **wings-incident-response** → **wings-trust-recovery** |
| New feature | **wings-project** + relevant domain skill |

## Skills (`.cursor/skills/`)

| Skill | Purpose |
|-------|---------|
| [wings-ship-gate](skills/wings-ship-gate/SKILL.md) | **Mandatory pre-merge/deploy checklist** |
| [wings-ship-gate/decision-tree.md](skills/wings-ship-gate/decision-tree.md) | Merge / deploy / rollback decisions |
| [wings-incident-response](skills/wings-incident-response/SKILL.md) | Active data-loss runbook |
| [wings-trust-recovery](skills/wings-trust-recovery/SKILL.md) | User communication, rebuilding trust |
| [wings-data-safety](skills/wings-data-safety/SKILL.md) | Load/save/draft/collab rules |
| [wings-data-safety/code-paths.md](skills/wings-data-safety/code-paths.md) | Every load/save path |
| [wings-data-safety/forbidden-patterns.md](skills/wings-data-safety/forbidden-patterns.md) | Anti-patterns that caused incident |
| [wings-data-safety/incident-postmortem.md](skills/wings-data-safety/incident-postmortem.md) | Why users lost trust |
| [wings-block-editor](skills/wings-block-editor/SKILL.md) | TipTap architecture |
| [wings-block-editor/extension-checklist.md](skills/wings-block-editor/extension-checklist.md) | PR checklist for extensions |
| [wings-block-editor/pitfalls.md](skills/wings-block-editor/pitfalls.md) | Full regression registry |
| [wings-journal-app](skills/wings-journal-app/SKILL.md) | Index, sidebar, CRUD |
| [wings-supabase](skills/wings-supabase/SKILL.md) | Migrations, RLS |
| [wings-auth-routing](skills/wings-auth-routing/SKILL.md) | Auth, routes |
| [wings-sharing](skills/wings-sharing/SKILL.md) | Roles, tokens |
| [wings-collab](skills/wings-collab/SKILL.md) | Yjs / Hocuspocus |
| [wings-ai](skills/wings-ai/SKILL.md) | BYOK AI |
| [wings-testing](skills/wings-testing/SKILL.md) | Vitest + Playwright |
| [wings-deploy](skills/wings-deploy/SKILL.md) | Vercel, env, secrets |
| [wings-project](skills/wings-project/SKILL.md) | Repo layout |

## Cursor rules (auto-attached)

- `wings-core.mdc` — always on
- `data-safety.mdc`, `block-editor.mdc`, `supabase.mdc`, `testing.mdc` — by glob

## Agent loops (`.cursor/loops/`)

Recurring **research → clarify → act → verify → document** workflows. Read [loops/README.md](loops/README.md) and [loops/protocol.md](loops/protocol.md) first.

| Loop | Command |
|------|---------|
| Intent clarify | `/loop @.cursor/loops/intent-clarify.loop.md` |
| Ship gate | `/loop 20m @.cursor/loops/ship-gate.loop.md` |
| Error fix | `/loop @.cursor/loops/error-fix.loop.md` |
| Docs research | `/loop 30m @.cursor/loops/docs-research.loop.md` |
| Skills sync | `/loop 1h @.cursor/loops/skills-sync.loop.md` |
| Incident watch | `/loop 15m @.cursor/loops/incident-watch.loop.md` |
| Editor health | `/loop 20m @.cursor/loops/editor-health.loop.md` |

**Rule:** Nothing assumed — verify against code every tick. Ask back if intent, environment, or risk is unclear.

## Critical invariants (never break)

```
LOAD:  resolveInitialEditorContent — empty JSON ≠ beat markdown
SAVE:  shouldBlockEmptySave — empty ≠ overwrite ≥20 chars
DRAFT: shouldApplyDraft — empty draft ≠ overwrite server
QUEUE: shouldReplayPendingWrite — after fetch, before replay
EDITOR: one Link | suggestionPluginKeys | WritingExperience @ 200
DB:     no anon SELECT entries | no migration DELETE content
```

## Commands

```bash
bun run test:editor && bun run test:e2e && bun run build   # ship gate
bun run recover:entries                                     # before/after deploy
bun run recover:entries:apply                               # repair DB rows
CI=1 E2E_PORT=8099 bun run test:e2e                         # fresh server
```

## Trust recovery principle

When in doubt: **do not ship**. Roll back. Run recover script. Restore from PITR. Then fix with tests.
