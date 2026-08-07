-- Local vault mode: per-page storage flag + user default preference.
-- Additive only — no UPDATE/DELETE on existing body columns.

ALTER TABLE public.entries
  ADD COLUMN IF NOT EXISTS content_storage text NOT NULL DEFAULT 'cloud'
  CHECK (content_storage IN ('cloud', 'local'));

ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS default_content_storage text NOT NULL DEFAULT 'cloud'
  CHECK (default_content_storage IN ('cloud', 'local', 'ask'));
