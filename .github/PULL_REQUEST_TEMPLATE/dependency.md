## Summary

<!-- Package(s) upgraded and from → to versions -->

## Packages

| Package | From | To | Reason |
|---------|------|-----|--------|
| | | | |

## Risk areas

<!-- e.g. TipTap, Excalidraw peers, React, Playwright -->

- [ ] TipTap / ProseMirror — run full editor test suite
- [ ] Excalidraw — verify `npm install --legacy-peer-deps` still works (Vercel)
- [ ] Supabase client — auth and CRUD smoke test
- [ ] Playwright — browser install / E2E green

## Lockfiles

- [ ] `bun.lockb` updated (`bun install`)
- [ ] `package-lock.json` updated if applicable
- [ ] `collab/package-lock.json` updated if collab deps changed

## Test plan

- [ ] `bun install --frozen-lockfile`
- [ ] `bun run test:editor`
- [ ] `bun run test:e2e`
- [ ] `bun run build`
- [ ] Manual smoke: <!-- if major version bump -->

## Breaking changes

<!-- From changelogs — migration steps for app code -->

None / <!-- list -->

## Checklist

- [ ] [COMMIT_CONVENTION.md](https://github.com/Sabique-Islam/wings/blob/master/.github/COMMIT_CONVENTION.md) — use `[chore]` prefix
- [ ] No accidental major upgrades without review
- [ ] Vite `dedupe` updated for new `@tiptap/*` packages if added
