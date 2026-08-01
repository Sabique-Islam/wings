---
slug: keyboard-first-notes
title: Keyboard-first notes in Wings
description: Slash commands, nested pages, AI panel, and export without leaving the keyboard. A practical guide to daily Wings shortcuts.
date: 2026-08-01
updated: 2026-08-01
tags:
  - keyboard
  - editor
  - how-to
---

# Keyboard-first notes in Wings

Wings is built for people who stay on the keyboard. Slash commands create blocks, ⌘K opens the palette, ⌘J opens AI on the current page, and export keeps your notes portable as markdown.

## How do I move around quickly?

Use ⌘K for the command palette, ⌘P for the quick switcher, ⌘N for a new page, and ⌘B to toggle the sidebar. ⌘/ focuses sidebar search. These shortcuts work once you are signed in at [wings.nopejs.me/auth](https://wings.nopejs.me/auth).

Press ⌘? (Ctrl+? on Windows or Linux) anywhere in the app for the full shortcut list.

## How do slash commands work?

Type `/` at the start of a line to insert headings, lists, tasks, code, callouts, math, drawings, and more. The menu is fuzzy-matched so short queries still find the block you want.

Nested pages keep long projects structured without dumping everything into one scroll. Link between pages and keep drafts local when you are offline.

## How do math and drawings fit the keyboard flow?

LaTeX blocks use familiar `$...$` and `$$...$$` patterns. Excalidraw scenes live as blocks inside the note so diagrams stay next to the prose they explain. You can still mouse-draw; the point is that the surrounding writing never forces you into a separate app.

## How do I get my notes out?

Export a page as markdown or JSON from the app. Markdown is the portable default for other editors. JSON preserves richer structure when you need a full dump. Combine export with the draft cache if you write on unreliable networks.

## FAQ

### Does Wings lock me into a proprietary format?

No. Blocks are markdown-compatible by design, and export is a first-class action. The project is AGPL-3.0 so you can inspect how serialization works.

### Can I use Wings only with a mouse?

Yes. Shortcuts are accelerators, not gates. Buttons and menus cover the same actions.

### Where is the full shortcut list?

In the app via ⌘?, or on the public docs page at [https://wings.nopejs.me/docs](https://wings.nopejs.me/docs) and [docs.md](https://wings.nopejs.me/docs.md).
