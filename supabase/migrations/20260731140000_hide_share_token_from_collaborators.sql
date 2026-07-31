-- Block collaborators from reading share_token via PostgREST on entries.
-- Owners keep full SELECT on entries; invite-based reads go through RPC only.

DROP POLICY IF EXISTS "Shared users can view shared entries" ON public.entries;

CREATE OR REPLACE FUNCTION public.fetch_collaborator_entries(
  _ids uuid[],
  _include_deleted boolean DEFAULT false
)
RETURNS TABLE (
  id uuid,
  content text,
  content_json jsonb,
  created_at timestamptz,
  user_id uuid,
  pinned boolean,
  parent_id uuid,
  title text,
  layout jsonb,
  deleted_at timestamptz,
  properties jsonb,
  sort_order double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.id,
    e.content,
    e.content_json,
    e.created_at,
    e.user_id,
    e.pinned,
    e.parent_id,
    e.title,
    e.layout,
    e.deleted_at,
    e.properties,
    e.sort_order
  FROM public.entries e
  WHERE e.id = ANY(_ids)
    AND public.has_entry_share_role(e.id, ARRAY['viewer', 'editor', 'admin'])
    AND (_include_deleted OR e.deleted_at IS NULL);
$$;

REVOKE ALL ON FUNCTION public.fetch_collaborator_entries(uuid[], boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fetch_collaborator_entries(uuid[], boolean) TO authenticated;
