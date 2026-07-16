# Loop Protocol — Shared Rules

**Every loop in `.cursor/loops/` inherits this protocol.** Agents must read this before executing any loop tick.

---

## 1. Clarify-before-act gate (mandatory)

Before research or edits on tick 0 (and again if scope shifts mid-loop):

### Must ask the user if ANY of these are unknown

| Unknown | Example ask-back |
|---------|------------------|
| **Goal** | "Are we fixing CI, shipping a feature, or only documenting?" |
| **Scope** | "Editor only, or also Index save path?" |
| **Success criteria** | "Green CI enough, or also manual smoke on staging?" |
| **Risk tolerance** | "OK to change save guards, or read-only investigation?" |
| **Environment** | "Local, staging, or production Supabase?" |
| **Deploy state** | "Has the data-safety fix been deployed to prod yet?" |
| **User comms** | "Should I draft an email to affected users?" |

### How to ask

- Use **AskQuestion** tool when 2+ discrete options exist.
- Otherwise: one short message listing **options A / B / C** with tradeoffs.
- **Never** pick an option silently when the choice affects user data, deploy, or comms.

### When NOT to ask (proceed with research)

- User gave explicit instruction in this session ("fix the E2E failure")
- Loop file defines unambiguous verify commands (e.g. run `test:ci`)
- Pure read-only research tick with no file writes

---

## 2. Research-first (nothing assumed)

Every tick follows **R → A → V → D**:

```
RESEARCH  → read files, run commands, grep, check git diff
ACT       → only after research confirms the problem/solution
VERIFY    → re-run proof commands
DOCUMENT  → update skills if new fact discovered
```

### Research checklist (minimum)

- [ ] Read the **actual files** referenced in the task — not skill summaries alone
- [ ] Run **verify commands** from the loop file — capture exit codes
- [ ] Check **git status / diff** — know what's already changed
- [ ] Grep for **forbidden patterns** when touching persistence (see `wings-data-safety/forbidden-patterns.md`)
- [ ] If external docs needed (TipTap, Supabase, Playwright) — fetch or search; cite source

### Stale documentation rule

If skill text contradicts code → **code wins**. Fix the skill in the DOCUMENT step.

---

## 3. Fix-if-required loop

When VERIFY fails:

```
attempt = 0
max_attempts = 3   # unless loop file says otherwise

while verify fails and attempt < max_attempts:
  1. RESEARCH root cause (logs, stack trace, failing assertion)
  2. Propose fix OR present options to user if >1 valid fix
  3. ACT (minimal diff)
  4. VERIFY (same commands as gate)
  5. attempt += 1

if still failing:
  ASK BACK with: what failed, what was tried, recommended next steps
  do NOT ship / do NOT mark done
```

### Fix constraints (Wings-specific)

- Never weaken `shouldBlockEmptySave`, `shouldApplyDraft`, `shouldReplayPendingWrite`, or `resolveInitialEditorContent` to make tests pass.
- Never skip E2E to get green CI.
- Never commit unless user asked.

---

## 4. Discuss options with user

When research finds **multiple valid paths**, present:

```markdown
## Options (need your pick)

**A — [name]** (recommended if …)
- Pros: …
- Cons: …
- Risk to user data: low / medium / high

**B — [name]**
- Pros: …
- Cons: …

**C — Do nothing this tick**
- When: …

Which should I proceed with?
```

Recommended = first option, with reason. User can pick Other.

---

## 5. Real-time documentation

At end of every tick that changed understanding:

| Finding | Update |
|---------|--------|
| New save/load path | `wings-data-safety/code-paths.md` |
| New pitfall | `wings-block-editor/pitfalls.md` + test |
| Forbidden pattern | `wings-data-safety/forbidden-patterns.md` |
| CI failure pattern | `wings-testing/SKILL.md` |
| New invariant | `wings-core.mdc` + `AGENTS.md` |

Format: date + one-line fact + file:line reference.

---

## 6. Tick report template

Every loop tick ends with:

```markdown
## Loop tick — [loop name] — [timestamp]

**Intent:** [confirmed goal or "awaiting user"]
**Research:** [commands run, files read]
**Result:** PASS | FAIL | BLOCKED (needs user)
**Changes:** [files touched or none]
**Docs updated:** [paths or none]
**Next tick:** [what happens next / ask-back pending]
```

---

## 7. Stop conditions

Kill the loop when:

- User says stop / cancel loop
- VERIFY pass AND user confirmed done
- BLOCKED on user decision >1 tick (ask once, then wait)
- Same failure 3× with no progress → escalate, stop auto-fix

---

## 8. Priority order (conflicts)

1. **User data safety** — rollback beats feature work
2. **User explicit instruction** — overrides loop defaults
3. **Tier 0 ship gate** — overrides convenience
4. **Loop verify commands** — overrides agent judgment
5. **Skill docs** — lowest; verify against code
