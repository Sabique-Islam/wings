---
slug: byok-ai-in-the-browser
title: BYOK AI in the browser
description: Wings runs its AI panel with your own provider keys in the browser. Keys stay local. Prompts go to the model you choose, not to a Wings-hosted model stack.
date: 2026-08-01
updated: 2026-08-01
tags:
  - ai
  - privacy
  - byok
---

# BYOK AI in the browser

Wings uses bring-your-own-key (BYOK) AI. You paste a provider key in the browser, open the AI panel with ⌘J, and prompts go to that provider with the page you have open as context. Wings does not store your keys on its servers.

## What does BYOK mean in Wings?

BYOK means you configure OpenAI, Anthropic, Google, or another supported provider yourself. The key lives in browser storage on your device. When you invoke the assistant, the client sends the active page context and your prompt to the provider API you chose.

There is no Wings-hosted model credit meter for the free product today. Hosted AI credits may appear on a future paid plan. Until then, AI quality and cost follow your own provider account.

## Why keep keys in the browser?

Server-held keys are convenient for product teams and risky for users who want clear custody of credentials. Client-side keys make the trust boundary obvious: Wings hosts auth and page sync; your model vendor sees the prompts you send.

That split also matches how many engineers already work. You already have API keys. Wings should not invent a second billing layer before the editor itself is trustworthy.

## What context does the AI see?

The panel is built around the open page, not a blank chat. It can read the current note, help draft the next section, shorten a selection, or spin up related pages from a prompt. Excalidraw and math on the page can be included when the client gathers context.

You stay in control of when the panel runs. Nothing is sent until you ask.

## FAQ

### Does Wings train models on my notes?

No. Wings is not a model trainer. Your Content Signals and robots rules opt public marketing pages out of many training crawlers. Private notes are disallowed for crawlers and are not a public corpus.

### Which providers work?

Provider plugins live under the AI settings in the app. Support grows over time. Check the in-app provider list for the current set.

### Can I use Wings without AI?

Yes. The editor, math, drawings, share links, and export work without any provider key.
