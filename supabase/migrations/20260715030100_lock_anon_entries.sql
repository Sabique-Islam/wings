-- Security hardening: stop anon from reading the entries table (and the wide
-- shared_entries_view) directly. Public share pages now go through a narrow
-- SECURITY DEFINER RPC that returns a single row for an exact token match.

-- 1) Narrow RPC for public share pages. Returns only display fields, never
-- user_id / share_token / parent_id, and only for a live (non-deleted) entry.
CREATE OR REPLACE FUNCTION public.get_shared_entry(_token text)
RETURNS TABLE (id uuid, title text, content text, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.id, e.title, e.content, e.created_at
  FROM public.entries e
  WHERE e.share_token IS NOT NULL
    AND e.share_token = _token
    AND e.deleted_at IS NULL
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_shared_entry(text) TO anon, authenticated;

-- 2) Remove the direct anon read paths.
DROP POLICY IF EXISTS "Anyone can view entries by share token" ON public.entries;
DROP POLICY IF EXISTS "Anyone can view shared entries" ON public.entries;

-- The wide view leaked every shared entry to anyone who queried it without a
-- token filter (security_invoker still relied on the dropped header policy).
DROP VIEW IF EXISTS public.shared_entries_view;

REVOKE SELECT ON public.entries FROM anon;
