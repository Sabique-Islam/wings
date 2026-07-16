# Loop: Intent Clarify

**Run this before any non-trivial task** — or as tick 0 of other loops when the user's message is vague.

## Trigger

```
/loop @.cursor/loops/intent-clarify.loop.md
```

Also: agent self-invokes when user message missing ≥2 of {goal, scope, success, environment}.

---

## CLARIFY (this loop IS the clarify gate)

### Extract from user message

| Field | Found? | If missing → ask |
|-------|--------|------------------|
| Goal | | "What outcome do you want when this is done?" |
| Scope | | "Which files/systems — editor, saves, DB, deploy, comms?" |
| Success criteria | | "How will we know it worked?" |
| Constraints | | "Anything off limits — no commits, no prod, no schema changes?" |
| Urgency | | "Incident now, or planned work?" |
| Audience | | "Just me, or user-facing comms needed?" |

### Ask-back templates

**Vague feature request:**
> Before I touch code: should this change **load path**, **save path**, **editor UX**, or **all three**? Data-loss guards apply to the first two — I'll read `wings-data-safety` first if either is in scope.

**"Fix it" without context:**
> What should I verify is fixed — CI, a specific test name, blank pages in prod, or something else? I'll run the matching loop (`error-fix`, `ship-gate`, or `incident-watch`).

**Deploy request:**
> Confirm: deploy **frontend only**, **migrations too**, or **collab server**? I'll run `recover:entries` before and after if any save/load code ships.

---

## RESEARCH (light — only to inform questions)

```bash
git status --short
git log -3 --oneline
```

Read last user message + conversation summary. Do not edit files in this loop unless user confirms intent.

---

## ACT

1. Summarize understood intent in 2–3 sentences
2. List **assumptions still open** (must be empty to proceed to other loops)
3. If options exist, present A/B/C (see protocol.md)
4. Recommend which loop to start next

---

## VERIFY

- [ ] User confirmed intent OR user gave explicit "proceed with X"
- [ ] No open questions about prod vs local
- [ ] Risk class stated: `read-only` | `code-change` | `deploy` | `incident`

---

## PROMPT

```json
{
  "prompt": "Run intent-clarify loop (.cursor/loops/intent-clarify.loop.md). Read protocol.md. Parse the latest user request — do NOT assume goal, scope, or environment. List what's known vs unknown. Ask back for every unknown using AskQuestion or options A/B/C. Only after user confirms, recommend the next loop (ship-gate, error-fix, docs-research, etc.). No file edits until intent verified."
}
```

---

## STOP

After user confirms → hand off to named loop. Do not re-run intent-clarify unless scope changes.
