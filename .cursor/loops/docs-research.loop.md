# Loop: Docs Research

High-quality **real-time documentation** — verify every claim in `.cursor/` against live code; fix drift; never assume skills are correct.

## Trigger

```
/loop 30m @.cursor/loops/docs-research.loop.md
/loop 1h research docs — sync skills with codebase
```

**When:** After merges, before major features, when user says "document everything".

---

## CLARIFY (tick 0)

| Unknown | Ask |
|---------|-----|
| Focus area | "All skills or editor/saves/DB only?" |
| Write access | "Update .cursor/ files this tick?" |
| Depth | "Spot-check invariants or full code-path audit?" |
| External docs | "Include TipTap/Supabase version-specific research?" |

Default if silent: **audit Tier 0 invariants + code-paths.md call sites**.

---

## RESEARCH (core of this loop)

### Phase A — Inventory

```bash
find .cursor/skills -name 'SKILL.md' -o -name '*.md' | sort
find .cursor/rules -name '*.mdc' | sort
find .cursor/loops -name '*.md' | sort
```

### Phase B — Verify claims (nothing assumed)

For each invariant in `AGENTS.md`, **grep + read** the source:

| Claim | Verify command / file |
|-------|----------------------|
| `resolveInitialEditorContent` used everywhere | `rg "resolveInitialEditorContent" src/` |
| No forbidden load pattern | `rg "contentJson\?\.type" src/` |
| All `updateEntry` guarded | `rg "updateEntry" src/ -n` then read each callsite |
| Suggestion keys centralized | `rg "PluginKey" src/components/BlockEditor/` |
| WritingExperience priority 200 | read `WritingExperienceExtension.ts` |
| StarterKit link false | read `editorExtensions.ts` |
| Pending replay deps include entries | read `Index.tsx` useEffect deps |

### Phase C — Cross-check tests exist

| Guard / behavior | Test file | Test name pattern |
|------------------|-----------|-------------------|
| isEmptyDoc | editorContent.test.ts | detects empty |
| shouldBlockEmptySave | editorContent.test.ts | blocks empty autosave |
| Link once | BlockEditor.test.ts | registers Link |
| Suggestion keys | BlockEditor.test.ts | distinct keys |
| E2E mount | editor-enter.spec.ts | ProseMirror |

### Phase D — External research (when skill cites behavior)

If documenting TipTap / Playwright / Supabase behavior:

1. Web search or fetch official docs
2. Note **version** from `package.json`
3. Cite URL + version in skill update

```bash
rg "@tiptap/core" package.json
rg "playwright" package.json
```

---

## ACT

1. Produce **drift report**:

```markdown
## Docs drift report

| Doc claim | Code reality | Action |
|-----------|--------------|--------|
| ... | MATCH / DRIFT / UNVERIFIED | update / add test / ask user |
```

2. Fix drift in `.cursor/skills/` (not code unless drift is bug in code)
3. If code is wrong vs intended invariant → **ask user** before code fix

---

## VERIFY

- [ ] Every Tier 0 invariant row is MATCH or has ticket/ask-back
- [ ] `code-paths.md` lists all `updateEntry` callsites
- [ ] `pitfalls.md` entries have test reference or UNTESTED flag
- [ ] No doc claims "always" without file:line citation

---

## FIX

| Drift type | Fix |
|------------|-----|
| Skill stale, code correct | Update skill |
| Skill correct, code wrong | Ask user → error-fix loop |
| Missing test | Ask user → add test in ship-gate loop |
| Missing code path in audit | Add to code-paths.md |

---

## DOCUMENT

This loop **is** documentation. Output each tick:

- Updated skill files (list paths)
- Drift report appended to tick summary
- New file:line citations added

---

## ASK BACK

- Skill and code disagree on **intent** (bug vs doc error)
- Missing save path found without guard
- External docs conflict with installed package version

---

## PROMPT

```json
{
  "prompt": "Run docs-research loop (.cursor/loops/docs-research.loop.md + protocol.md). CLARIFY focus if needed. RESEARCH: inventory .cursor/, verify every AGENTS.md invariant against src/ with rg+read, cross-check tests, check package versions for external claims. ACT: drift report, update skills with file:line citations. VERIFY: all Tier 0 claims MATCH or escalated. Never assume skills are accurate. Ask user if code/skill intent conflict."
}
```

---

## STOP

- Drift report all MATCH
- User confirms docs good enough
- Blocked on intent conflict
