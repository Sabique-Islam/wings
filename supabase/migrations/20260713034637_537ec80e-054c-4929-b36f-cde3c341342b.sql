
-- Slice A foundation: content_json storage, trash, versions, comments, full-text search

-- 1) entries: content_json (structured source of truth) + deleted_at (soft delete)
ALTER TABLE public.entries
  ADD COLUMN IF NOT EXISTS content_json JSONB,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS entries_deleted_at_idx ON public.entries (deleted_at);
CREATE INDEX IF NOT EXISTS entries_parent_id_idx ON public.entries (parent_id);

-- 2) Full-text search over title + content
ALTER TABLE public.entries
  ADD COLUMN IF NOT EXISTS search_tsv TSVECTOR
    GENERATED ALWAYS AS (
      setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(content, '')), 'B')
    ) STORED;

CREATE INDEX IF NOT EXISTS entries_search_tsv_idx ON public.entries USING GIN (search_tsv);

-- 3) entry_versions: automatic snapshots for history/restore
CREATE TABLE IF NOT EXISTS public.entry_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_id UUID NOT NULL REFERENCES public.entries(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL DEFAULT '',
  content_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS entry_versions_entry_id_idx ON public.entry_versions (entry_id, created_at DESC);

GRANT SELECT, INSERT, DELETE ON public.entry_versions TO authenticated;
GRANT ALL ON public.entry_versions TO service_role;

ALTER TABLE public.entry_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "versions readable by entry viewers"
  ON public.entry_versions FOR SELECT
  TO authenticated
  USING (
    public.is_entry_owner(entry_id)
    OR public.has_entry_share_role(entry_id, ARRAY['viewer','editor','admin'])
  );

CREATE POLICY "versions insertable by editors"
  ON public.entry_versions FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_entry_owner(entry_id)
    OR public.has_entry_share_role(entry_id, ARRAY['editor','admin'])
  );

CREATE POLICY "versions deletable by owner"
  ON public.entry_versions FOR DELETE
  TO authenticated
  USING (public.is_entry_owner(entry_id));

-- 4) entry_comments: inline block-level comments
CREATE TABLE IF NOT EXISTS public.entry_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_id UUID NOT NULL REFERENCES public.entries(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  block_id TEXT,
  body TEXT NOT NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS entry_comments_entry_id_idx ON public.entry_comments (entry_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.entry_comments TO authenticated;
GRANT ALL ON public.entry_comments TO service_role;

ALTER TABLE public.entry_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comments readable by entry viewers"
  ON public.entry_comments FOR SELECT
  TO authenticated
  USING (
    public.is_entry_owner(entry_id)
    OR public.has_entry_share_role(entry_id, ARRAY['viewer','editor','admin'])
  );

CREATE POLICY "comments insertable by viewers+"
  ON public.entry_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = auth.uid() AND (
      public.is_entry_owner(entry_id)
      OR public.has_entry_share_role(entry_id, ARRAY['viewer','editor','admin'])
    )
  );

CREATE POLICY "comments updatable by author"
  ON public.entry_comments FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "comments deletable by author or owner"
  ON public.entry_comments FOR DELETE
  TO authenticated
  USING (author_id = auth.uid() OR public.is_entry_owner(entry_id));

CREATE TRIGGER update_entry_comments_updated_at
  BEFORE UPDATE ON public.entry_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
