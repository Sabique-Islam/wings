-- Server-owned "Shared with me" bootstrap: claim pending email invites, return
-- collaborator entries + roles and owned pages that have outbound shares.
-- Data-safe: function + indexes + realtime publication only; no row deletes.

CREATE INDEX IF NOT EXISTS entry_shares_shared_with_user_id_idx
  ON public.entry_shares (shared_with_user_id)
  WHERE shared_with_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS entry_shares_shared_with_email_lower_idx
  ON public.entry_shares (lower(shared_with_email));

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

  -- Bind pending invites (created before the account existed) to this user.
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

REVOKE ALL ON FUNCTION public.fetch_share_workspace(boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fetch_share_workspace(boolean) TO authenticated;

-- Realtime: invitees receive INSERT/UPDATE/DELETE on rows their RLS allows.
ALTER TABLE public.entry_shares REPLICA IDENTITY FULL;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.entry_shares;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
