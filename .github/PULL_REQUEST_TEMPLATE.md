<!-- Default PR template. For specialized templates, open a PR with ?template=<name>.md -->
<!-- e.g. ?template=editor.md | feature.md | bugfix.md | database.md | docs.md | refactor.md | dependency.md -->

## Summary

<!-- What does this PR do? One or two sentences. -->

## Type of change

- [ ] Bug fix → consider reopening with `?template=bugfix.md`
- [ ] New feature → consider `?template=feature.md`
- [ ] Editor / BlockEditor → use `?template=editor.md`
- [ ] Database / Supabase → use `?template=database.md`
- [ ] Documentation → use `?template=docs.md`
- [ ] Refactor → use `?template=refactor.md`
- [ ] Dependencies → use `?template=dependency.md`

## Related issues

<!-- Fixes #123 -->

## Changes

-

## Test plan

- [ ] `bun run test:editor`
- [ ] `bun run test:e2e`
- [ ] `bun run build`
- [ ] Manual smoke test

## Checklist

- [ ] [COMMIT_CONVENTION.md](https://github.com/Sabique-Islam/wings/blob/master/.github/COMMIT_CONVENTION.md)
- [ ] [CONTRIBUTING.md](https://github.com/Sabique-Islam/wings/blob/master/.github/CONTRIBUTING.md) ship gate followed for editor/save changes
- [ ] No secrets committed

## All PR templates

| Template | Use for |
|----------|---------|
| [default.md](https://github.com/Sabique-Islam/wings/blob/master/.github/PULL_REQUEST_TEMPLATE/default.md) | General changes |
| [feature.md](https://github.com/Sabique-Islam/wings/blob/master/.github/PULL_REQUEST_TEMPLATE/feature.md) | New functionality |
| [bugfix.md](https://github.com/Sabique-Islam/wings/blob/master/.github/PULL_REQUEST_TEMPLATE/bugfix.md) | Bug fixes |
| [editor.md](https://github.com/Sabique-Islam/wings/blob/master/.github/PULL_REQUEST_TEMPLATE/editor.md) | TipTap, blocks, keyboard |
| [database.md](https://github.com/Sabique-Islam/wings/blob/master/.github/PULL_REQUEST_TEMPLATE/database.md) | Migrations, RLS, edge functions |
| [docs.md](https://github.com/Sabique-Islam/wings/blob/master/.github/PULL_REQUEST_TEMPLATE/docs.md) | Documentation only |
| [refactor.md](https://github.com/Sabique-Islam/wings/blob/master/.github/PULL_REQUEST_TEMPLATE/refactor.md) | Behavior-preserving refactors |
| [dependency.md](https://github.com/Sabique-Islam/wings/blob/master/.github/PULL_REQUEST_TEMPLATE/dependency.md) | Package upgrades |
