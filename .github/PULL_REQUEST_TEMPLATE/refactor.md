## Summary

<!-- Refactor scope in one sentence. Behavior should be unchanged. -->

## Motivation

<!-- Why refactor now? Link issue if any -->

## Scope

**In scope:**

-

**Out of scope ( intentionally not changed ):**

-

## Behavior equivalence

<!-- How did you verify no behavior change? -->

- [ ] Existing tests pass unchanged
- [ ] Manual smoke test: <!-- brief steps -->
- [ ] Intentional behavior change (requires `[feat]` or `[fix]` template instead): <!-- explain -->

## Test plan

- [ ] `bun run test:editor`
- [ ] `bun run test:e2e`
- [ ] `bun run build`

## Checklist

- [ ] [COMMIT_CONVENTION.md](https://github.com/Sabique-Islam/wings/blob/master/.github/COMMIT_CONVENTION.md) — use `[refactor]` prefix
- [ ] Diff avoids drive-by formatting unrelated to refactor
- [ ] No save/load logic changes without data-safety tests
