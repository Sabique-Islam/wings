## Summary

<!-- New capability in one or two sentences. -->

## Motivation

<!-- What problem does this solve? Link issue if any: Fixes # -->

## User-facing behavior

<!-- What can users do now that they could not before? -->

## Implementation notes

<!-- Key files, design choices, trade-offs -->

## Test plan

- [ ] `bun run test:editor`
- [ ] `bun run test:e2e`
- [ ] `bun run build`
- [ ] Manual: <!-- steps -->

## Screenshots / recordings

<!-- Required for visible UI changes -->

## Data safety

- [ ] Does not change save/load paths
- [ ] If it does: added/updated tests for `editorContent` guards
- [ ] Manually verified: open page → edit → refresh → content persists

## Checklist

- [ ] [COMMIT_CONVENTION.md](https://github.com/Sabique-Islam/wings/blob/master/.github/COMMIT_CONVENTION.md) — use `[feat]` prefix
- [ ] Documentation updated if user-visible
- [ ] No new secrets in client bundle
