-- Add content_storage to share RPC projections (SELECT-only change).

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
  sort_order double precision,
  content_storage text
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
    e.sort_order,
    e.content_storage
  FROM public.entries e
  WHERE e.id = ANY(_ids)
    AND public.has_entry_share_role(e.id, ARRAY['viewer', 'editor', 'admin'])
    AND (_include_deleted OR e.deleted_at IS NULL);
$$;

CREATE OR REPLACE FUNCTION public.fetch_share_workspace(
  _include_deleted boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  uid uuid := auth.uid();
  email text := lower(public.current_user_email());
BEGIN
  IF uid IS NULL THEN
    RETURN json_build_object(
      'collaborators', '[]'::json,
      'owned_shared_ids', '[]'::json
    );
  END IF;

  IF email <> '' THEN
    UPDATE public.entry_shares
    SET shared_with_user_id = uid
    WHERE shared_with_user_id IS NULL
      AND lower(shared_with_email) = email;
  END IF;

  SELECT json_build_object(
    'collaborators', COALESCE((
      SELECT json_agg(row_to_json(x) ORDER BY x.created_at DESC)
      FROM (
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
          e.sort_order,
          e.content_storage,
          es.role
        FROM public.entry_shares es
        INNER JOIN public.entries e ON e.id = es.entry_id
        WHERE es.shared_with_user_id = uid
          AND e.user_id IS DISTINCT FROM uid
          AND (_include_deleted OR e.deleted_at IS NULL)
      ) x
    ), '[]'::json),
    'owned_shared_ids', COALESCE((
      SELECT json_agg(DISTINCT es.entry_id)
      FROM public.entry_shares es
      INNER JOIN public.entries e ON e.id = es.entry_id
      WHERE e.user_id = uid
    ), '[]'::json)
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.fetch_collaborator_entries(uuid[], boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fetch_collaborator_entries(uuid[], boolean) TO authenticated;

REVOKE ALL ON FUNCTION public.fetch_share_workspace(boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fetch_share_workspace(boolean) TO authenticated;
