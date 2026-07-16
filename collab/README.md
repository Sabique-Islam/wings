# Wings collab server

Self-hosted [Hocuspocus](https://tiptap.dev/docs/hocuspocus/server/hooks) WebSocket for Yjs realtime editing on shared pages.

## Setup

```bash
cd collab
npm install
export SUPABASE_URL=...
export SUPABASE_SERVICE_ROLE_KEY=...
npm run dev
```

Set `VITE_COLLAB_URL=ws://localhost:1234` in the app `.env`.

Apply migration `20260716100000_content_yjs.sql` via `supabase db push`.

## Auth

Clients connect with their Supabase JWT. The server verifies the user owns the entry or has `editor`/`admin` share role before joining room `entry:{uuid}`.

## Persistence

Yjs state is stored as binary in `entries.content_yjs`. Solo saves still write `content` + `content_json` when not in a live collab session.

### First collab session seed (`collab/server.ts` + `seedDocument.ts`)

When `content_yjs` is null on fetch:

1. Prefer non-empty `content_json` → `TiptapTransformer.toYdoc` via `getSeedExtensions()`
2. Else non-empty `content` markdown → minimal doc (paragraphs/headings)
3. Persist encoded state to `content_yjs` immediately (one-time) so later fetches use binary history

Client still creates bare `Y.Doc` in `useCollabProvider.ts:47`; server fetch supplies initial state via Hocuspocus sync.
