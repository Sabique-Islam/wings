-- Page properties (status, date, tags) shown above the editor.
--
-- One JSONB column rather than a table per property type: the set is small and
-- fixed, and every read of a page already fetches the row.
ALTER TABLE public.entries
  ADD COLUMN IF NOT EXISTS properties jsonb NOT NULL DEFAULT '{}'::jsonb;
