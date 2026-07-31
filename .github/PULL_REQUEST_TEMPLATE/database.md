## Summary

<!-- Migration, RLS, RPC, edge function, or storage change -->

## Type

- [ ] New migration
- [ ] RLS policy change
- [ ] New/updated RPC function
- [ ] Edge function change
- [ ] Storage bucket / policy
- [ ] Generated types update

## Migration file(s)

<!-- e.g. supabase/migrations/20260731120000_add_foo.sql -->

## Schema / policy changes

<!-- Describe tables, columns, policies, functions -->

## Safety review

- [ ] **New migration file only** — did not edit existing migrations
- [ ] No `DELETE`, `TRUNCATE`, or bulk `UPDATE` on `entries.content` / `content_json`
- [ ] RLS tested: owner, collaborator, anonymous (public share) as applicable
- [ ] Backward compatible with current production app (or deploy order documented)

## Rollout

<!-- Order of operations: migrate first, deploy app, deploy edge function, etc. -->

1.

## Test plan

- [ ] Applied locally: `supabase db push` (or SQL editor)
- [ ] Verified queries from app still work
- [ ] Edge function tested: <!-- command or steps -->
- [ ] `bun run test:editor` / `bun run test:e2e` if app code changed
- [ ] `bun run recover:entries` dry run before/after if touching entries table

## Checklist

- [ ] [COMMIT_CONVENTION.md](https://github.com/Sabique-Islam/wings/blob/master/.github/COMMIT_CONVENTION.md) — use `[db]` prefix for migrations
- [ ] Types regenerated if schema changed (`src/integrations/supabase/types.ts`)
