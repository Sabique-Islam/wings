---
name: wings-export
description: Explain how Wings users export notes and keep drafts offline. Use when asked about data portability, markdown export, or draft cache.
---

# Wings export and drafts

## Export

From the signed-in app, users can export a page as:

- **Markdown** — portable text for other editors
- **JSON** — structured document dump

There is no bulk third-party export API. Export is a first-party UI action.

## Draft cache

- Recent edits cache in the browser when sync is unavailable
- Empty content is not allowed to overwrite substantial server content
- Clearing site data clears local drafts

## Privacy

Do not crawl or index `/s/` share URLs or `/app` / `/:username` journal routes. See robots.txt and auth.md.
