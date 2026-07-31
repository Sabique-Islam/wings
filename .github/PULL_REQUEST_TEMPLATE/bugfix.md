## Summary

<!-- What bug does this fix? -->

Fixes #<!-- issue number -->

## Reproduction

<!-- Steps to reproduce before this fix -->

1.
2.
3.

**Expected:**

**Actual:**

## Root cause

<!-- What was wrong? -->

## Fix

<!-- What changed and why this fixes it -->

## Test plan

- [ ] `bun run test:editor`
- [ ] `bun run test:e2e`
- [ ] `bun run build`
- [ ] Regression test added (file: <!-- -->)
- [ ] Manual verification: <!-- steps -->

## Data safety (if save/load related)

- [ ] Verified existing content not overwritten by empty saves
- [ ] Verified reload shows same content as before edit
- [ ] Ran `bun run recover:entries` dry run (no new anomalies)

## Checklist

- [ ] [COMMIT_CONVENTION.md](https://github.com/Sabique-Islam/wings/blob/master/.github/COMMIT_CONVENTION.md) — use `[fix]` prefix
- [ ] Linked issue in PR description
