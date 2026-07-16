# Loop: Editor Health

During active BlockEditor work — **mount, E2E, pitfall registry**, fix regressions before they ship.

## Trigger

```
/loop 20m @.cursor/loops/editor-health.loop.md
/loop @.cursor/loops/editor-health.loop.md
```

**When:** Editing `src/components/BlockEditor/**` or `editorExtensions.ts`.

---

## CLARIFY

| Unknown | Ask |
|---------|-----|
| Feature vs fix | "New block or regression fix?" |
| E2E required? | Always yes for keyboard/suggestion — confirm if user wants skip |
| Collab in scope? | "Test shared page or solo only?" |

---

## RESEARCH

```bash
git diff --name-only -- src/components/BlockEditor/
bun run test:editor
CI=1 E2E_PORT=8099 bun run test:e2e
```

Read if changed:
- `suggestionPluginKeys.ts`
- `WritingExperienceExtension.ts` (priority)
- `editorExtensions.ts` (StarterKit config)
- `BlockEditor.tsx` (useMemo, getPages conditional)

Check pitfalls registry:
```bash
rg -l "D6|E1|E2" .cursor/skills/wings-block-editor/pitfalls.md
```

---

## ACT

Run extension-checklist mentally against diff.

If fail:
1. Match symptom to `pitfalls.md` ID
2. Fix per skill
3. Add test if pitfall had no test

---

## VERIFY

| Check | Command / assert |
|-------|------------------|
| Unit wiring | `bun run test:editor` exit 0 |
| Mount | E2E finds `.ProseMirror` |
| Enter | editor-enter.spec.ts pass |
| Notion parity | editor-notion-parity.spec.ts pass |
| No duplicate Link | test name in BlockEditor.test.ts |

---

## FIX

Follow error-fix loop rules. Editor-specific:

- suggestion$ → keys + vite dedupe
- No ProseMirror → ErrorBoundary, read browser console from E2E trace
- Enter ignores slash → priority 200

---

## DOCUMENT

New editor gotcha → `pitfalls.md` row + extension-checklist if needed.

---

## ASK BACK

- Need new PluginKey for third suggestion menu
- Priority conflict between new extension and slash/Enter
- Collab + solo behavior diverge

---

## PROMPT

```json
{
  "prompt": "Run editor-health loop (.cursor/loops/editor-health.loop.md + protocol.md + wings-block-editor). CLARIFY feature scope. RESEARCH: diff BlockEditor, test:editor, CI=1 E2E_PORT=8099 test:e2e, read changed extension files. VERIFY mount+Enter+parity. FIX via pitfalls.md mapping. DOCUMENT new pitfalls. Ask before new PluginKey or priority changes."
}
```

---

## STOP

- test:editor + test:e2e green
- No BlockEditor diff in last 2 ticks
- User stops
