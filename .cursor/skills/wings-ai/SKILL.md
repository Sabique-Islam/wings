---
name: wings-ai
description: >-
  Wings BYOK AI assistant, inline AI, provider plugins, tool blocks, and Excalidraw
  context. Use when adding AI providers, changing AIAssistant, or editor-AI parity.
---

# Wings AI

## Architecture

**Fully client-side BYOK** — API keys in localStorage, never sent to Wings servers.

```
AIAssistant (side panel)     Cmd+J, nw:openAI
InlineAIMenu                 Selection-based
src/lib/ai/client.ts         streamChat, generateImage
src/lib/ai/providers/        Per-vendor implementations
src/lib/ai/storage.ts        Keys + model preferences
```

## Providers

Google (default), OpenAI, Anthropic, Groq, xAI, Moonshot, MiniMax.

Add provider:

1. Create `src/lib/ai/providers/<name>.ts`
2. Register in `providers/index.ts`
3. Add to settings UI if exposed

## Tool block protocol

AIAssistant parses fenced blocks:

````
```tool:write
content here
```
````

Types: `write`, `replace`, `newpage`, `image` — applied to workspace via editor commands.

## Editor bridge

AI reads/writes via window globals:

- `__nw_getMarkdown()` — current doc as markdown
- `__nw_editor` — TipTap instance for insert/replace
- `htmlToMarkdown(editor.getHTML())` — must match stored content

**Parity requirement:** E2E tests assert stored === preview === AI text.

## Excalidraw + page image context

`src/lib/ai/excalidrawContext.ts` — collects drawing snapshots from entry content for vision attachments.

`src/lib/ai/pageImageContext.ts` — collects pasted/uploaded page images (`![](url)`) for vision attachments. Text context always lists them; pixels attach only when `mentionsVisual` matches (same cost gate as drawings).

## Storage keys

Current: `wings_ai_key_<provider>`, model prefs in `storage.ts`.

Legacy migration from `nw_gemini_api_key` handled in storage layer.

## Slash / UI entry points

- Slash command "Ask AI" → `onAskAI` → `nw:openAI`
- Header Sparkles button, Cmd+J global shortcut

## Image generation

OpenAI / Gemini fallback paths in `client.ts` `generateImage`.

## Related

- **wings-block-editor** — `__nw_*` globals, slash menu
- **wings-testing** — AI parity E2E assertions
- **wings-data-safety** — AI must not trigger empty overwrites
