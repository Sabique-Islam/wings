# Contributing to Wings

Thank you for your interest in contributing. Wings is a block-based journal with nested pages, a TipTap editor, Supabase persistence, optional realtime collaboration, and BYOK AI. Every change that touches the editor or save/load paths is production-critical — user data loss occurred in 2026 and we treat regressions seriously.

## Before you start

1. Read this guide and the linked docs below.
2. Set up the project locally — see [LOCAL_SETUP.md](https://github.com/Sabique-Islam/wings/blob/master/.github/LOCAL_SETUP.md).
3. New to the codebase? Start with [BEGINNER_GUIDE.md](https://github.com/Sabique-Islam/wings/blob/master/.github/BEGINNER_GUIDE.md).
4. Follow [COMMIT_CONVENTION.md](https://github.com/Sabique-Islam/wings/blob/master/.github/COMMIT_CONVENTION.md) for commit messages.
5. Open issues using the [issue templates](https://github.com/Sabique-Islam/wings/issues/new/choose) when reporting bugs or requesting features.

## Documentation index

| Doc | Purpose |
|-----|---------|
| [BEGINNER_GUIDE.md](https://github.com/Sabique-Islam/wings/blob/master/.github/BEGINNER_GUIDE.md) | Plain-language tour of the repo for first-time contributors |
| [LOCAL_SETUP.md](https://github.com/Sabique-Islam/wings/blob/master/.github/LOCAL_SETUP.md) | Step-by-step dev environment setup |
| [COMMIT_CONVENTION.md](https://github.com/Sabique-Islam/wings/blob/master/.github/COMMIT_CONVENTION.md) | Commit message format and types |
| [PULL_REQUEST_TEMPLATE/](https://github.com/Sabique-Islam/wings/tree/master/.github/PULL_REQUEST_TEMPLATE) | PR templates by change type |
| [ISSUE_TEMPLATE/](https://github.com/Sabique-Islam/wings/tree/master/.github/ISSUE_TEMPLATE) | Issue templates for bugs, features, incidents, etc. |
| [CODE_OF_CONDUCT.md](https://github.com/Sabique-Islam/wings/blob/master/.github/CODE_OF_CONDUCT.md) | Community standards |
| [SECURITY.md](https://github.com/Sabique-Islam/wings/blob/master/.github/SECURITY.md) | How to report vulnerabilities |

## How to contribute

### 1. Find or open an issue

- Search [existing issues](https://github.com/Sabique-Islam/wings/issues) before opening a duplicate.
- Use the appropriate issue template (bug, feature, editor regression, data loss, docs).
- For large features, open an issue first so we can align on approach before you invest significant time.

### 2. Fork and branch

Branch names must follow:

```
username/type/short-desc
```

- **username** — your GitHub username (or familiar handle)
- **type** — same family as commit types: `feat`, `fix`, `docs`, `refactor`, `chore`, `db`, `test`, …
- **short-desc** — kebab-case summary (lowercase, hyphens, no spaces)

```bash
git checkout -b sabique/feat/image-attachment-ai
git checkout -b jane/fix/empty-save-guard
git checkout -b alex/docs/local-setup-guide
```

Keep branches focused — one logical change per PR when possible.

If you need a new **type** segment (e.g. `a11y`), propose it in the PR — see [COMMIT_CONVENTION.md](https://github.com/Sabique-Islam/wings/blob/master/.github/COMMIT_CONVENTION.md).

### 3. Make your changes

Follow existing project conventions:

- **Import alias:** `@/` → `src/`
- **Package manager:** Bun for CI and scripts (`bun.lockb` must stay in sync)
- **Dev port:** `8080` (OAuth redirect URLs depend on this)
- **Minimal diffs:** match surrounding style; do not refactor unrelated code

#### Where code belongs

| Task | Location |
|------|----------|
| New page/route | `src/pages/` + `src/App.tsx` |
| New block type | `src/components/BlockEditor/*Extension*` + `editorExtensions.ts` |
| DB change | new file in `supabase/migrations/` (never edit old migrations) |
| Edge function | `supabase/functions/<name>/index.ts` |
| Shared lib | `src/lib/` |
| E2E test | `tests/*.spec.ts`, harness at `/__editor-e2e` |

See [wings-project skill](https://github.com/Sabique-Islam/wings/blob/master/.cursor/skills/wings-project/SKILL.md) for more detail.

### 4. Test before opening a PR

**Always run for editor or persistence changes:**

```bash
bun install --frozen-lockfile
bun run test:editor
bun run test:e2e
bun run build
```

Or the combined CI script:

```bash
bun run test:ci && bun run build
```

If port 8080 is busy:

```bash
CI=1 E2E_PORT=8099 bun run test:e2e
```

#### Critical invariants (never break)

| Area | Rule |
|------|------|
| Load | Empty JSON must not beat markdown (`resolveInitialEditorContent`) |
| Save | Empty content must not overwrite ≥20 chars (`shouldBlockEmptySave`) |
| Drafts | Empty draft must not overwrite server content (`shouldApplyDraft`) |
| Pending | Replay pending writes only after fetch (`shouldReplayPendingWrite`) |
| Editor | One Link extension; distinct suggestion plugin keys; WritingExperience priority 200 |
| Database | No migration that DELETE/TRUNCATE entry content without explicit approval |

Read [wings-data-safety](https://github.com/Sabique-Islam/wings/blob/master/.cursor/skills/wings-data-safety/SKILL.md) and [wings-ship-gate](https://github.com/Sabique-Islam/wings/blob/master/.cursor/skills/wings-ship-gate/SKILL.md) before touching save/load or the editor.

### 5. Open a pull request

Choose the PR template that matches your change type:

- [Default](https://github.com/Sabique-Islam/wings/blob/master/.github/PULL_REQUEST_TEMPLATE/default.md) — general changes
- [Feature](https://github.com/Sabique-Islam/wings/blob/master/.github/PULL_REQUEST_TEMPLATE/feature.md) — new functionality
- [Bug fix](https://github.com/Sabique-Islam/wings/blob/master/.github/PULL_REQUEST_TEMPLATE/bugfix.md) — fixes a reported issue
- [Editor / BlockEditor](https://github.com/Sabique-Islam/wings/blob/master/.github/PULL_REQUEST_TEMPLATE/editor.md) — TipTap, blocks, keyboard, slash menu
- [Database / Supabase](https://github.com/Sabique-Islam/wings/blob/master/.github/PULL_REQUEST_TEMPLATE/database.md) — migrations, RLS, edge functions
- [Documentation](https://github.com/Sabique-Islam/wings/blob/master/.github/PULL_REQUEST_TEMPLATE/docs.md) — README, guides, comments-only
- [Refactor](https://github.com/Sabique-Islam/wings/blob/master/.github/PULL_REQUEST_TEMPLATE/refactor.md) — behavior-preserving restructuring
- [Dependencies](https://github.com/Sabique-Islam/wings/blob/master/.github/PULL_REQUEST_TEMPLATE/dependency.md) — package upgrades

When creating the PR on GitHub, use a compare URL like `https://github.com/Sabique-Islam/wings/compare/master...your-branch?template=editor.md`.

Fill in every section of the template. Link related issues (`Fixes #123`). Include screenshots or screen recordings for UI changes.

### 6. Review process

- Maintainers may request changes; please respond promptly.
- CI must pass (editor unit tests, Playwright E2E, build).
- Editor and persistence PRs get extra scrutiny — be patient and thorough in the test plan.
- Squash or rebase as requested before merge.

## What we welcome

- Bug fixes with reproduction steps and tests
- Editor improvements with Playwright coverage
- Documentation and onboarding improvements
- Performance fixes with measurable impact
- Accessibility improvements
- Test coverage for untested critical paths

## What needs discussion first

- Breaking API or schema changes
- Migrations that modify or delete existing entry content
- New external services or paid dependencies
- Large architectural refactors
- Changes to auth, sharing permissions, or RLS policies

## Code style

- Write obvious code before clever code.
- Match existing naming, formatting, and patterns in the file you edit.
- Prefer deleting code over adding more.
- Comments explain *why*, not *what*.
- No secrets in commits — use `.env` locally, never commit `.env`.

See [code-style rule](https://github.com/Sabique-Islam/wings/blob/master/.cursor/rules/code-style.mdc) for the full style guide used in this repo.

## Getting help

- Open a [Discussion](https://github.com/Sabique-Islam/wings/discussions) or comment on your issue/PR.
- For security issues, do **not** open a public issue — see [SECURITY.md](https://github.com/Sabique-Islam/wings/blob/master/.github/SECURITY.md).

## License

Wings is licensed under the [GNU Affero General Public License v3.0 or later](https://github.com/Sabique-Islam/wings/blob/master/LICENSE) (AGPL-3.0). This is a strong copyleft license: if you modify this software and run it as a network service, you must offer corresponding source to users who interact with it over the network.

By contributing, you agree that your contributions will be licensed under the same terms.
