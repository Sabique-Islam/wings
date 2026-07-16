# Loop: Skills Sync

Post-change sync — ensure skills, rules, loops, and tests **stay aligned** after every meaningful merge.

## Trigger

```
/loop 1h @.cursor/loops/skills-sync.loop.md
```

Run after: editor changes, save-path changes, new migrations, incident fixes.

---

## CLARIFY

| Unknown | Ask |
|---------|-----|
| What merged? | PR link or `git log` range |
| New domain? | "Need new skill file?" |

If `git log -1` shows clear merge → proceed.

---

## RESEARCH

```bash
git log -5 --oneline
git diff HEAD~1 --name-only
git diff HEAD~1 --stat
```

Map changed paths → skills:

| Path pattern | Skill to review |
|--------------|-----------------|
| `BlockEditor/**` | wings-block-editor, pitfalls, extension-checklist |
| `Index.tsx`, `editorContent*`, `draftCache*` | wings-data-safety, code-paths |
| `supabase/migrations/**` | wings-supabase |
| `collab/**` | wings-collab |
| `tests/**` | wings-testing |
| `.github/workflows/**` | wings-ship-gate, wings-testing |

Run docs-research **Phase B** subset for changed domains only.

---

## ACT

1. Update affected skills with accurate file refs
2. Add pitfall row if regression class discovered
3. Update `AGENTS.md` index if new skill/loop added
4. Update `wings-core.mdc` if new non-negotiable invariant

---

## VERIFY

- [ ] Changed behavior reflected in at least one skill
- [ ] If persistence change → `code-paths.md` updated
- [ ] If new pitfall → test exists or UNTESTED flagged

---

## PROMPT

```json
{
  "prompt": "Run skills-sync loop (.cursor/loops/skills-sync.loop.md + protocol.md). RESEARCH last 5 commits and diff. Map files to skills. Update .cursor/ for any drift. Run subset of docs-research verify for changed domains. Ask user if new skill needed. No code changes unless doc revealed bug."
}
```

---

## STOP

After sync complete for latest merge batch.
