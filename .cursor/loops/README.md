# Wings Agent Loops

Recurring agent workflows for **verify → research → clarify → act → document → recheck**.

## Philosophy

| Rule | Meaning |
|------|---------|
| **Nothing assumed** | Read code, run commands, grep the repo. Do not infer behavior from memory or skill docs alone — skills can be stale. |
| **Intent cleared first** | If trigger, scope, success criteria, or risk tolerance is unclear → **stop and ask** before editing. |
| **Research before action** | Every loop tick starts with evidence gathering, not fixes. |
| **Fix only with proof** | A failing test, log line, or user report is proof. "Probably broken" is not. |
| **Document in real time** | Update `.cursor/skills/` when you learn something the repo didn't document. |
| **Offer options** | When multiple valid paths exist, present tradeoffs and let the user choose. |

## How to start a loop

In Cursor chat:

```
/loop 15m @.cursor/loops/ship-gate.loop.md
/loop 30m @.cursor/loops/docs-research.loop.md
/loop @.cursor/loops/error-fix.loop.md          # dynamic schedule
```

Or paste the **Prompt** block from any loop file as the `/loop` argument.

## Loop index

| Loop | File | Schedule | Use when |
|------|------|----------|----------|
| **Protocol** (read first) | [protocol.md](protocol.md) | — | Shared rules for all loops |
| **Intent clarify** | [intent-clarify.loop.md](intent-clarify.loop.md) | Before any task | Scope/risk/success unclear |
| **Ship gate** | [ship-gate.loop.md](ship-gate.loop.md) | 15–30m during PR/deploy | Pre-merge verification + fix |
| **Error fix** | [error-fix.loop.md](error-fix.loop.md) | Dynamic (event-driven) | CI red, test failures |
| **Docs research** | [docs-research.loop.md](docs-research.loop.md) | 30m or on file change | Skills/rules drift from code |
| **Skills sync** | [skills-sync.loop.md](skills-sync.loop.md) | 1h or post-merge | Keep `.cursor/` accurate |
| **Incident watch** | [incident-watch.loop.md](incident-watch.loop.md) | 15m post-deploy | Data-loss signals |
| **Editor health** | [editor-health.loop.md](editor-health.loop.md) | 20m during editor work | Mount, E2E, pitfall registry |

## Loop anatomy (every `.loop.md` file)

```
1. TRIGGER      — when to run, /loop command
2. CLARIFY      — questions to ask if intent unclear (mandatory gate)
3. RESEARCH     — files to read, commands to run (no assumptions)
4. ACT          — allowed actions this tick
5. VERIFY       — pass/fail criteria
6. FIX          — if verify fails, fix loop (max retries, escalation)
7. DOCUMENT     — what to update in .cursor/ or code comments
8. ASK BACK     — when to pause and discuss options with user
9. PROMPT       — copy-paste payload for /loop
10. STOP        — when to kill the loop
```

## Sentinel names (for monitored shell)

| Loop | Fixed sentinel | Dynamic sentinel |
|------|----------------|------------------|
| ship-gate | `AGENT_LOOP_TICK_SHIP_GATE` | `AGENT_LOOP_WAKE_SHIP_GATE` |
| error-fix | — | `AGENT_LOOP_WAKE_ERROR_FIX` |
| docs-research | `AGENT_LOOP_TICK_DOCS` | `AGENT_LOOP_WAKE_DOCS` |
| skills-sync | `AGENT_LOOP_TICK_SKILLS` | — |
| incident-watch | `AGENT_LOOP_TICK_INCIDENT` | — |
| editor-health | `AGENT_LOOP_TICK_EDITOR` | `AGENT_LOOP_WAKE_EDITOR` |

## Related

- [`.cursor/AGENTS.md`](../AGENTS.md) — skill index
- [`.cursor/skills/wings-ship-gate/`](../skills/wings-ship-gate/SKILL.md) — Tier 0 gates
