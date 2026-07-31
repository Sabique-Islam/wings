## Summary

<!-- Editor change: blocks, keyboard, slash/@ menu, serialization, etc. -->

## Area

- [ ] New block / extension
- [ ] Keyboard / Enter / Backspace behavior
- [ ] Slash command menu
- [ ] Page mention / wikilinks
- [ ] Markdown round-trip / serialize
- [ ] Bubble menu / formatting
- [ ] Paste / drag-drop
- [ ] Other: <!-- -->

## Related issues

Fixes #<!-- -->

## Implementation

<!-- Extensions touched, priority changes, plugin keys -->

**Files:**

-

## Ship gate (required for BlockEditor changes)

- [ ] Read [wings-block-editor skill](https://github.com/Sabique-Islam/wings/blob/master/.cursor/skills/wings-block-editor/SKILL.md)
- [ ] Link extension registered exactly once (if applicable)
- [ ] Suggestion plugin keys remain distinct
- [ ] WritingExperience priority unchanged (200) unless intentional and tested
- [ ] New `@tiptap/*` deps added to Vite `dedupe` if needed

## Test plan

- [ ] `bun run test:editor` — all green
- [ ] `bun run test:e2e` — all green
- [ ] `bun run build`
- [ ] `/__editor-e2e` loads without ErrorBoundary
- [ ] Manual keyboard checks:
  - [ ] Enter → new paragraph
  - [ ] Shift+Enter → line break in block
  - [ ] Slash menu inserts block
  - [ ] Navigate away and back — content intact

## Playwright

- [ ] New or updated spec: <!-- file name -->
- [ ] Not applicable (explain why)

## Screenshots / recordings

<!-- Strongly recommended for UI/editor behavior -->

## Checklist

- [ ] [COMMIT_CONVENTION.md](https://github.com/Sabique-Islam/wings/blob/master/.github/COMMIT_CONVENTION.md) — `[feat]` or `[fix]`
- [ ] No changes to save/load without data-safety review
