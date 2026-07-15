-- Security hardening: bind ownership/author columns on writes, tighten
-- helper-function privileges, drop duplicated legacy triggers, and enforce
-- username rules (charset/length + reserved names + race-safe signup).

-- ---------------------------------------------------------------------------
-- entry_shares: force created_by = caller; freeze created_by / entry_id.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_share_created_by()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.created_by := auth.uid();
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
      RAISE EXCEPTION 'created_by cannot be changed';
    END IF;
    IF NEW.entry_id IS DISTINCT FROM OLD.entry_id THEN
      RAISE EXCEPTION 'entry_id cannot be changed';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_share_created_by ON public.entry_shares;
CREATE TRIGGER enforce_share_created_by
BEFORE INSERT OR UPDATE ON public.entry_shares
FOR EACH ROW
EXECUTE FUNCTION public.enforce_share_created_by();

-- Drop duplicated legacy triggers (superseded by the *_before_write versions).
DROP TRIGGER IF EXISTS validate_share_role_trigger ON public.entry_shares;
DROP TRIGGER IF EXISTS resolve_share_user_trigger ON public.entry_shares;

-- ---------------------------------------------------------------------------
-- entry_versions: author_id must be the caller (or null).
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "versions insertable by editors" ON public.entry_versions;
CREATE POLICY "versions insertable by editors"
  ON public.entry_versions FOR INSERT
  TO authenticated
  WITH CHECK (
    (author_id IS NULL OR author_id = auth.uid())
    AND (
      public.is_entry_owner(entry_id)
      OR public.has_entry_share_role(entry_id, ARRAY['editor','admin'])
    )
  );

-- ---------------------------------------------------------------------------
-- entry_comments: freeze entry_id / author_id on update so an author can't
-- relocate or reattribute a comment.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_comment_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF NEW.entry_id IS DISTINCT FROM OLD.entry_id THEN
    RAISE EXCEPTION 'entry_id cannot be changed';
  END IF;
  IF NEW.author_id IS DISTINCT FROM OLD.author_id THEN
    RAISE EXCEPTION 'author_id cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_comment_columns ON public.entry_comments;
CREATE TRIGGER protect_comment_columns
BEFORE UPDATE ON public.entry_comments
FOR EACH ROW
EXECUTE FUNCTION public.protect_comment_columns();

-- ---------------------------------------------------------------------------
-- Restrict helper function execution to authenticated (they expose owner ids).
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.entry_owner_id(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.entry_owner_id(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Username rules: charset/length CHECK + reserved-name enforcement.
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_preferences
  DROP CONSTRAINT IF EXISTS user_preferences_username_format;
ALTER TABLE public.user_preferences
  ADD CONSTRAINT user_preferences_username_format
  CHECK (username ~ '^[a-z0-9][a-z0-9_-]{1,29}$') NOT VALID;

CREATE OR REPLACE FUNCTION public.is_reserved_username(_username text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(_username) = ANY (ARRAY[
    'admin','root','auth','login','logout','signup','signin',
    'api','app','n','s','pricing','about','careers','blog',
    'contact','changelog','roadmap','docs','support','status',
    'press','legal','privacy','terms','security','cookies',
    'settings','account','profile','user','users','team',
    'dashboard','home','help','sitemap','robots','well-known',
    'billing','checkout','pay','payments','404','500'
  ]);
$$;

-- Reject reserved names on user-initiated writes. The signup trigger below
-- runs as service_role and is exempt (it already avoids reserved names).
CREATE OR REPLACE FUNCTION public.validate_username_reserved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF public.is_reserved_username(NEW.username) THEN
    RAISE EXCEPTION 'username "%" is reserved', NEW.username;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_username_reserved ON public.user_preferences;
CREATE TRIGGER validate_username_reserved
BEFORE INSERT OR UPDATE OF username ON public.user_preferences
FOR EACH ROW
EXECUTE FUNCTION public.validate_username_reserved();

-- ---------------------------------------------------------------------------
-- Race-safe signup username assignment: retry on unique_violation and skip
-- reserved candidates.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_username text;
  candidate text;
  suffix int := 0;
  attempts int := 0;
BEGIN
  base_username := lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-z0-9_]', '', 'g'));
  IF base_username IS NULL OR length(base_username) < 3 THEN
    base_username := 'user' || substr(replace(NEW.id::text, '-', ''), 1, 6);
  END IF;

  candidate := base_username;

  LOOP
    attempts := attempts + 1;

    -- Skip taken or reserved candidates before attempting the insert.
    IF public.is_reserved_username(candidate)
       OR EXISTS (SELECT 1 FROM public.user_preferences WHERE lower(username) = candidate) THEN
      suffix := suffix + 1;
      candidate := base_username || suffix::text;
      CONTINUE;
    END IF;

    BEGIN
      INSERT INTO public.user_preferences (user_id, username)
      VALUES (NEW.id, candidate)
      ON CONFLICT (user_id) DO NOTHING;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      -- Lost a race for this username; fall back to a random suffix.
      candidate := base_username || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
    END;

    IF attempts >= 50 THEN
      candidate := 'user' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);
      INSERT INTO public.user_preferences (user_id, username)
      VALUES (NEW.id, candidate)
      ON CONFLICT (user_id) DO NOTHING;
      EXIT;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;
