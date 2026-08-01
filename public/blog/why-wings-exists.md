---
slug: why-wings-exists
title: Why Wings exists
description: I hit a Notion workspace limit in February 2026 and built a notes app for myself. Friends used it. It grew into Wings.
date: 2026-08-01
updated: 2026-08-01
tags:
  - origin
  - notion
  - product
---

# Why Wings exists

Wings started as a personal escape hatch from a Notion workspace limit in February 2026. It was never meant to be a product. Friends used it anyway, and the editor kept growing into the notes app at [wings.nopejs.me](https://wings.nopejs.me).

## What problem did Wings start from?

In February 2026 I hit my Notion workspace limit. I needed somewhere for nested pages, math, and drawings without waiting on a billing change. I spun up a small web editor on Lovable for myself with no roadmap and no launch plan.

That origin still shapes the product. Features ship when they remove friction for real writing, not when they fill a marketing checklist.

## How did a personal tool become a product?

Friends asked for accounts. I kept fixing bugs and adding keyboard shortcuts when something felt missing. In July 2026 the stack moved off Lovable onto a personal React, Vite, Supabase, and TipTap setup. The live site is [https://wings.nopejs.me](https://wings.nopejs.me).

Wings is still a small project. The editor runs in the browser. Pages sync through Supabase. AI is bring-your-own-key so prompts go to the provider you configure.

## What is Wings today?

Wings is a web notes app with nested pages, a block editor, LaTeX math, Excalidraw drawings, share links, markdown export, and a BYOK AI panel. Sign in with Google or a magic link. The source is AGPL-3.0 on [GitHub](https://github.com/Sabique-Islam/wings).

If you want the short version: it is a keyboard-first notes corner that refuses to be a proprietary format trap.

## FAQ

### Is Wings a Notion clone?

No. It borrows familiar block-editor patterns (slash commands, nested pages) but stays markdown-friendly, open source under AGPL, and BYOK for AI. The goal is a calm writing surface, not a full workspace suite.

### Is Wings free?

Yes for the features that ship today. Paid plans for hosted AI credits are planned and not live yet. See [pricing](https://wings.nopejs.me/pricing).

### Where do I start?

Open [https://wings.nopejs.me/auth](https://wings.nopejs.me/auth), sign in, and press ⌘? in the app for shortcuts. Docs live at [/docs](https://wings.nopejs.me/docs).


---

Written by Opus 5 for site content. To be rewritten later.
