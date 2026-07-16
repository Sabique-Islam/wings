# Loop: Ship Gate

Pre-merge / pre-deploy verification with **recheck → fix → recheck** until Tier 0–1 pass or blocked on user.

## Trigger

```
/loop 20m @.cursor/loops/ship-gate.loop.md
/loop 15m run ship gate — verify Tier 0, fix failures, update docs
```

**When:** Active PR, before deploy, after editor/persistence changes.

---

## CLARIFY (tick 0)

Ask if unknown:

| Question | Why |
|----------|-----|
| Deploying to prod this session? | Triggers `recover:entries` before/after |
| Which branch / PR? | Scope of diff |
| May I commit fixes? | User rule: no commit unless asked |
| Manual smoke OK to skip? | Only if docs-only change confirmed |

---

## RESEARCH (every tick — no assumptions)

```bash
git status --short
git diff --stat
git diff --name-only main...HEAD 2>/dev/null || git diff --name-only
```

Read changed files if touching:
- `src/lib/editorContent.ts`, `src/pages/Index.tsx` → `wings-data-safety/code-paths.md`
- `src/components/BlockEditor/**` → `wings-block-editor/pitfalls.md`
- `supabase/migrations/**` → `wings-supabase/SKILL.md`

Grep forbidden patterns:
```bash
rg "contentJson\?\.type === \"doc\"" src/ || true
rg "pluginKey: new PluginKey\(\"suggestion\"\)" src/ || true
rg "link: true" src/components/BlockEditor/editorExtensions.ts || true
```

---

## ACT — Run Tier 0 + Tier 1

```bash
bun run test -- src/lib/editorContent.test.ts
bun run test:editor
CI=1 E2E_PORT=8099 bun run test:e2e
bun run build
```

Optional Tier 3 (if deploy planned):
```bash
bun run recover:entries
```

Record: exit code + failing test names + first error line.

---

## VERIFY

| Tier | Pass condition |
|------|----------------|
| 0 | All 6 editorContent tests pass |
| 0 | BlockEditor tests: Link once, suggestion keys, priority 200 |
| 1 | test:editor exit 0 |
| 1 | test:e2e exit 0 |
| 1 | build exit 0 |
| 3 | recover:entries — note fixable/lost counts |

---

## FIX (if verify fails)

1. **Classify failure** using `wings-testing/SKILL.md` CI diagnosis table
2. **Research** failing file — read test + implementation
3. If fix is ambiguous → **ASK BACK** with options (do not guess)
4. Minimal fix only
5. Re-run **full Tier 1** (not just the one test)

### Auto-fix allowed without ask

- Missing import in test file
- Stale selector in E2E (if test intent clear from spec)
- vite dedupe missing entry (if error proves duplicate PM)

### Ask before fix

- Any change to save/load guards
- Any change to extension priority or suggestion keys
- Skipping/removing a test

---

## DOCUMENT

If tick learned something new:
- Update relevant skill or `pitfalls.md`
- Add row to ship-gate Tier 0 if new data-loss class

---

## ASK BACK

- Tier 0 fails after 2 fix attempts
- recover:entries shows new fixable/lost rows vs last tick
- Diff touches migrations + entries table
- User asked for deploy but Tier 1 not green

---

## PROMPT

```json
{
  "prompt": "Run ship-gate loop (.cursor/loops/ship-gate.loop.md + protocol.md). CLARIFY: deploy? commit OK? RESEARCH: git diff, forbidden-pattern grep, read changed persistence/editor files. ACT: run editorContent.test, test:editor, CI=1 E2E_PORT=8099 test:e2e, build; recover:entries if deploy. VERIFY all Tier 0-1. FIX failures (max 3 attempts) — ask before touching save guards or skipping tests. DOCUMENT skill updates. Report tick template. Stop when all green or blocked on user."
}
```

---

## STOP

- All Tier 0–1 green AND user said done
- Blocked on user decision
- User: stop loop

**Do not stop** on first green if deploy planned but recover:entries not run.
