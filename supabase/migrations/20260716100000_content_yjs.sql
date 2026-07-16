-- Yjs binary persistence for realtime collaboration (Hocuspocus source of truth).
ALTER TABLE public.entries
  ADD COLUMN IF NOT EXISTS content_yjs bytea;
