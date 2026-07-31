# Pull request templates

When opening a PR, append `?template=<file>.md` to the compare URL to pre-fill the right checklist.

Example:

```
https://github.com/Sabique-Islam/wings/compare/master...your-branch?template=editor.md
```

| File | Use when |
|------|----------|
| [default.md](https://github.com/Sabique-Islam/wings/blob/master/.github/PULL_REQUEST_TEMPLATE/default.md) | General / mixed changes |
| [feature.md](https://github.com/Sabique-Islam/wings/blob/master/.github/PULL_REQUEST_TEMPLATE/feature.md) | New user-facing capability |
| [bugfix.md](https://github.com/Sabique-Islam/wings/blob/master/.github/PULL_REQUEST_TEMPLATE/bugfix.md) | Fixing a reported bug |
| [editor.md](https://github.com/Sabique-Islam/wings/blob/master/.github/PULL_REQUEST_TEMPLATE/editor.md) | BlockEditor, TipTap, keyboard, slash menu |
| [database.md](https://github.com/Sabique-Islam/wings/blob/master/.github/PULL_REQUEST_TEMPLATE/database.md) | Supabase migrations, RLS, RPCs, edge functions |
| [docs.md](https://github.com/Sabique-Islam/wings/blob/master/.github/PULL_REQUEST_TEMPLATE/docs.md) | Documentation-only PRs |
| [refactor.md](https://github.com/Sabique-Islam/wings/blob/master/.github/PULL_REQUEST_TEMPLATE/refactor.md) | Refactors with no intended behavior change |
| [dependency.md](https://github.com/Sabique-Islam/wings/blob/master/.github/PULL_REQUEST_TEMPLATE/dependency.md) | npm/Bun dependency upgrades |

Default fallback: [PULL_REQUEST_TEMPLATE.md](https://github.com/Sabique-Islam/wings/blob/master/.github/PULL_REQUEST_TEMPLATE.md)
