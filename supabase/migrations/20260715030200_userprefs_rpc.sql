-- Security hardening: user_preferences leaked every row (incl. sidebar state and
-- any future prefs) to any authenticated user via a USING(true) SELECT policy,
-- and to anon via table grant. Replace broad reads with narrow SECURITY DEFINER
-- RPCs; keep full-row SELECT owner-only.

DROP POLICY IF EXISTS "Authenticated users can view usernames" ON public.user_preferences;

REVOKE SELECT ON public.user_preferences FROM anon;

-- Case-insensitive availability check across all users. Excludes the caller's
-- own row so they can "re-save" their current name.
CREATE OR REPLACE FUNCTION public.is_username_available(_username text, _exclude_user_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.user_preferences
    WHERE lower(username) = lower(_username)
      AND (_exclude_user_id IS NULL OR user_id <> _exclude_user_id)
  );
$$;

-- Resolve a public username to its owning user id (for /:username pages).
CREATE OR REPLACE FUNCTION public.get_user_id_by_username(_username text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id
  FROM public.user_preferences
  WHERE lower(username) = lower(_username)
  LIMIT 1;
$$;

-- Reverse: username for a given user id (usernames are already public via URLs).
CREATE OR REPLACE FUNCTION public.lookup_username(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT username
  FROM public.user_preferences
  WHERE user_id = _user_id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.is_username_available(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_id_by_username(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_username(uuid) TO authenticated;
