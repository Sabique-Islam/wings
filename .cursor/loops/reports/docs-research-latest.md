# Docs Research — Latest Tick Report

Updated each docs-research loop tick. Previous ticks archived by git history.

---

## Tick — docs-research — 2026-07-16 (tick 0)

**Intent:** Tier 0 invariant audit + code-paths verification (default scope)  
**Loop armed:** every 30m (`AGENT_LOOP_TICK_DOCS`)

### Research commands

- `rg resolveInitialEditorContent`, `contentJson?.type`, `updateEntry`, `PluginKey`, guards in Index
- Read `WritingExperienceExtension.ts:273`, `editorExtensions.ts:90`, `SlashCommandExtension.tsx:460`
- `bun run test -- src/lib/editorContent.test.ts` → exit 0 (6/6)
- Package: `@tiptap/core` ^3.25.0, `@playwright/test` ^1.57.0

### Drift report

| Doc claim | Code reality | Action |
|-----------|--------------|--------|
| `resolveInitialEditorContent` only load path | `BlockEditor.tsx:16,39-40` | **MATCH** |
| No forbidden `contentJson?.type` load | No hits in `src/` | **MATCH** |
| All `updateEntry` guarded (3 callsites) | `Index.tsx:84,204,298` + guards at 78,198,293 | **MATCH** |
| Suggestion keys centralized | `suggestionPluginKeys.ts:3-4`; slash/page use them | **MATCH** |
| WritingExperience priority 200 | `WritingExperienceExtension.ts:273` | **MATCH** |
| StarterKit `link: false` | `editorExtensions.ts:90` | **MATCH** |
| Pending replay deps include `entries` | `Index.tsx:94` | **MATCH** |
| BlockEditor extensions memoized | `BlockEditor.tsx:88-107` | **MATCH** |
| `pluginKey` after spread | `SlashCommandExtension.tsx:457-460` | **MATCH** |
| vite dedupe `@tiptap/suggestion` | `vite.config.ts:30` | **MATCH** |
| BlockEditor null if !editor | `BlockEditor.tsx:315` | **MATCH** |
| SharedEntry markdown only | `SharedEntry.tsx:29,83` — no `contentJson` | **MATCH** |
| Collab seed from markdown | Server seeds via `seedDocument.ts` | **FIXED** (user picked A) |
| E2E mount `.ProseMirror` | `editor-enter.spec.ts:18-19` via `focusEditor` | **MATCH** |
| editorContent 6 tests | All pass | **MATCH** |
| code-paths line refs | Collab flush lines updated | **FIXED** |

### Docs updated this tick

- `wings-block-editor/pitfalls.md` — D7 marked UNTESTED + code gap
- `wings-data-safety/code-paths.md` — collab flush lines + updateEntry table
- `wings-collab/SKILL.md` — OPEN RISK with file:line citations

### Escalation (resolved)

**D7 — Collab Y.Doc seeding:** Implemented server-side fetch fallback (`collab/seedDocument.ts`, `seedExtensions.ts`, `server.ts`). Uses `@tiptap/y-tiptap` `prosemirrorJSONToYDoc` (TipTap v3 compatible). Smoke test: seed bytes 64/117.

### Verify checklist

- [x] Tier 0 invariants MATCH
- [x] `code-paths.md` lists all `updateEntry` callsites with guards
- [x] D7 implemented + documented
- [ ] Manual shared collab session test on staging

**Next tick:** Re-run invariant grep; check if D7 fix landed; scan new git diff since tick 0.
