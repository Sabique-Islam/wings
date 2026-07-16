# Loop: Incident Watch

Post-deploy monitoring for **data-loss signals** — recover script, test gate, ask user before any prod action.

## Trigger

```
/loop 15m @.cursor/loops/incident-watch.loop.md
```

**When:** First 2 hours after deploy touching editor/saves; or user reports blank pages.

---

## CLARIFY (mandatory for prod)

| Unknown | Ask |
|---------|-----|
| Environment | "Prod or staging Supabase?" |
| Deploy time | "When did deploy land?" |
| May run recover:apply? | "Dry run only or apply fixes?" |
| Rollback authority | "Should I recommend rollback?" |

**Never run `recover:entries:apply` on prod without explicit user approval.**

---

## RESEARCH

```bash
bun run test -- src/lib/editorContent.test.ts
bun run recover:entries
```

Read output categories:
- **Fixable** — markdown exists, JSON empty
- **JSON only** — markdown empty, JSON has nodes
- **Likely need PITR** — both empty

Compare counts to **baseline** (user should provide or from last tick notes).

Check for open incident:
- User messages about blank pages
- ErrorBoundary / suggestion$ in logs (if user provides)

Read: `wings-incident-response/SKILL.md`, `wings-trust-recovery/SKILL.md`

---

## ACT

| Signal | Action |
|--------|--------|
| Fixable count ↑ vs baseline | **ASK:** rollback + incident-response Phase 0 |
| Tier 0 tests fail | Trigger error-fix loop; recommend rollback if deployed |
| User report + fixable row | Recommend `recover:apply` + hard refresh comms template |
| Both-empty count ↑ | **STOP** — PITR, wings-incident-response Phase 2C |

Do not deploy fixes from this loop without ship-gate loop green.

---

## VERIFY

- [ ] recover:entries counts documented vs baseline
- [ ] Tier 0 unit tests pass
- [ ] No new user reports (ask user)

---

## ASK BACK (always for prod actions)

Present options:

**A — Rollback deploy** (recommended if counts worsened)  
**B — Run recover dry run only, draft user comms**  
**C — Run recover:apply** (requires explicit approval)  
**D — Continue watching next tick**

---

## PROMPT

```json
{
  "prompt": "Run incident-watch loop (.cursor/loops/incident-watch.loop.md + protocol.md + wings-incident-response). CLARIFY prod/staging and apply permission. RESEARCH: editorContent.test, recover:entries, compare to baseline. ACT: classify signals — never apply recover without approval. ASK BACK with rollback/recover/comms options. DOCUMENT counts in tick report. Escalate if both-empty count rises."
}
```

---

## STOP

- 2h post-deploy with stable counts + Tier 0 green
- User closes incident
- Escalated to human for PITR
