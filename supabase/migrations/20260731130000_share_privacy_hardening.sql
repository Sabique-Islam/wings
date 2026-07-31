-- Privacy hardening: narrow public share RPC, add list_my_shares() so clients
-- don't need an unfiltered REST scan of entry_shares.
-- Data-safe: function-only changes; no table/column updates or row mutations.

-- 1) Public share pages: display fields only (no entry id).
-- Postgres rejects CREATE OR REPLACE when OUT parameters change — drop first.
DROP FUNCTION IF EXISTS public.get_shared_entry(text);

CREATE FUNCTION public.get_shared_entry(_token text)
RETURNS TABLE (title text, content text, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.title, e.content, e.created_at
  FROM public.entries e
  WHERE e.share_token IS NOT NULL
    AND e.share_token = _token
    AND e.deleted_at IS NULL
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_shared_entry(text) TO anon, authenticated;

-- 2) Sidebar/collab bootstrap: rows the caller may see (mirrors entry_shares SELECT RLS).
CREATE OR REPLACE FUNCTION public.list_my_shares()
RETURNS TABLE (entry_id uuid, role text, shared_with_user_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT es.entry_id, es.role, es.shared_with_user_id
  FROM public.entry_shares es
  WHERE public.is_entry_owner(es.entry_id)
    OR es.shared_with_user_id = auth.uid()
    OR es.shared_with_email = public.current_user_email()
    OR EXISTS (
      SELECT 1
      FROM public.entry_shares admin_es
      WHERE admin_es.entry_id = es.entry_id
        AND admin_es.role = 'admin'
        AND (
          admin_es.shared_with_user_id = auth.uid()
          OR admin_es.shared_with_email = public.current_user_email()
        )
    );
$$;

REVOKE ALL ON FUNCTION public.list_my_shares() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_my_shares() TO authenticated;
