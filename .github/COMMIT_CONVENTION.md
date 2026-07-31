# Commit Convention

Wings uses a lightweight, tag-prefixed commit format. Keep subjects short and imperative. Use the body for context when needed.

## Format

```
[type] Short description in imperative mood

- Optional bullet explaining what changed
- Optional bullet explaining why or how to verify
```

### Subject line

- **Required:** `[type]` prefix followed by a space and a concise description.
- Use imperative mood: `Add`, `Fix`, `Update`, `Remove` — not `Added`, `Fixes`, `Updating`.
- No period at the end of the subject.
- Aim for ≤72 characters on the subject when possible.

### Body (optional)

- Separate from the subject with a blank line.
- Use `-` bullets for multiple points, test notes, or migration hints.
- Wrap lines at ~72–100 characters if writing paragraphs.

## Commit types

| Type | When to use | Example |
|------|-------------|---------|
| `[feat]` | New user-facing behavior or capability | `[feat] Add image attachment to AI assistant` |
| `[fix]` | Bug fix | `[fix] Prevent empty autosave from overwriting entry content` |
| `[refactor]` | Code change with no intended behavior change | `[refactor] Simplify ShareMenu loading logic` |
| `[test]` | Add or update tests only | `[test] Add editorContent guard regression tests` |
| `[docs]` | Documentation only | `[docs] Add local setup guide for contributors` |
| `[chore]` | Tooling, CI, deps, housekeeping | `[chore] Update Playwright to 1.57` |
| `[db]` | Database migrations, RLS, RPCs | `[db] Add sort_order column to entries` |
| `[style]` | Formatting, lint fixes, no logic change | `[style] Fix eslint warnings in BlockEditor` |
| `[perf]` | Performance improvement | `[perf] Skip redundant editor payload updates` |

## Examples

### Minimal (subject only)

```
[feat] Add fetchCollaboratorEntries for shared entry sidebar
```

### With body bullets

```
[fix] Block empty draft from overwriting server content on reload

- Guard shouldApplyDraft when draft markdown length is zero
- Add unit test mirroring production incident scenario
```

### Database migration

```
[db] Restrict share_token access for collaborators

- New RLS policy on entries.share_token
- No data backfill required
```

### Refactor

```
[refactor] Replace hardcoded CORS origins with allowedAppOrigins helper

- Reads COLLAB_ALLOWED_ORIGINS and SITE_URL from env
- Removes duplicated origin parsing in collab server
```

## Proposing a new commit type

If your change does not fit any type above, **propose a new `[type]` in your PR description** rather than inventing one silently.

Include in the PR:

1. The proposed tag name (e.g. `[i18n]`, `[a11y]`, `[collab]`).
2. When it should be used vs existing types.
3. One example commit message.

Maintainers will confirm or suggest an existing type before merge. Until approved, use the closest existing type (usually `[feat]`, `[fix]`, or `[chore]`).

## What to avoid

- Vague subjects: `[fix] fix bug`, `[feat] updates`
- Mixed concerns in one commit: split into logical commits when practical
- Commit messages that only reference ticket IDs without description
- Secrets, API keys, or `.env` contents in any commit
- `[WIP]` or `[temp]` on commits intended for `master`

## Pull requests and squash merges

If your PR contains multiple commits, each should follow this convention. On squash merge, the final commit message should still use `[type] Description` with an optional bullet body summarizing the PR.

## Branch naming

Branches use the same `type` as commits:

```
username/type/short-desc
```

Examples: `sabique/feat/image-attachment-ai`, `jane/fix/empty-save-guard`, `alex/refactor/share-menu-loading`

See [CONTRIBUTING.md](https://github.com/Sabique-Islam/wings/blob/master/.github/CONTRIBUTING.md) for the full branching workflow.

## Related

- [CONTRIBUTING.md](https://github.com/Sabique-Islam/wings/blob/master/.github/CONTRIBUTING.md) — full contribution workflow
- [PULL_REQUEST_TEMPLATE/](https://github.com/Sabique-Islam/wings/tree/master/.github/PULL_REQUEST_TEMPLATE) — PR templates by change type
