# Loop: Error Fix

Event-driven loop for **CI failures, test failures, runtime errors** — research root cause, fix, verify, document.

## Trigger

```
/loop @.cursor/loops/error-fix.loop.md
/loop 10m fix errors — recheck CI until green
```

**Dynamic wake:** re-arm when `git` changes, or fallback heartbeat **10m** if idle.

---

## CLARIFY (tick 0)

| Unknown | Ask |
|---------|-----|
| Which error? | Paste log / test name / CI URL |
| Reproduce locally? | "Should I run the same command CI runs?" |
| Scope of fix | "Minimal fix vs refactor?" |
| Commit? | "Create commit when green?" |

If user pasted failure output → skip clarify for error identity.

---

## RESEARCH (mandatory — never assume root cause)

### Step 1 — Capture evidence

```bash
git status --short
git log -1 --oneline
```

Run the **failing command** exactly (from CI workflow or user paste):

```bash
# Common Wings failures — run the one that matches
bun run test:editor
bun run test:e2e
CI=1 E2E_PORT=8099 bun run test:e2e
bun run test -- src/lib/editorContent.test.ts
bun run build
```

Read CI workflow if needed:
```bash
cat .github/workflows/editor-regression.yml
```

### Step 2 — Read failing test + source

- Test file: assertion + setup
- Implementation: line referenced in stack trace
- Related skill: `wings-testing/SKILL.md` diagnosis row

### Step 3 — Check for known pitfall

Search `wings-block-editor/pitfalls.md` and `wings-data-safety/forbidden-patterns.md` for matching symptom.

---

## ACT

1. State **hypothesis** with evidence (file:line)
2. If multiple hypotheses → present options A/B/C **before** editing
3. Apply **minimal** fix
4. Do not weaken data-safety guards to green tests

---

## VERIFY

Re-run **exact failing command** + parent suite:

| Failure type | Verify command |
|--------------|----------------|
| Unit test | full `test:editor` or `test -- <file>` |
| E2E | `CI=1 E2E_PORT=8099 bun run test:e2e` |
| Build | `bun run build` |
| Type error | build + affected test file |

Pass = exit 0 AND no new failures in suite.

---

## FIX loop

```
max_attempts = 3
for each attempt:
  research → fix → verify
  if pass: break
  if same error twice: change hypothesis or ask user
if fail after 3: STOP, report findings, suggest human review
```

---

## DOCUMENT

- New failure mode → `wings-testing/SKILL.md` CI diagnosis table
- Editor pitfall → `pitfalls.md` + regression test if missing

---

## ASK BACK

- Root cause unclear after research
- Fix requires architectural choice (e.g. debounce timing, collab vs solo save)
- Fix touches Tier 0 guards
- Flaky E2E (pass/fail non-deterministic) — suggest quarantine vs fix root cause

---

## PROMPT

```json
{
  "prompt": "Run error-fix loop (.cursor/loops/error-fix.loop.md + protocol.md). CLARIFY if error source unknown. RESEARCH: reproduce failure with exact CI command, read test+source+workflows, check pitfalls.md. State hypothesis with evidence. ACT: minimal fix only — ask before guard changes. VERIFY: re-run failing command + suite. Max 3 attempts then ask back. DOCUMENT new failure modes. Dynamic re-wake 10m or on git change."
}
```

---

## STOP

- Verify pass + user confirms
- Blocked 3 attempts
- User stops loop
