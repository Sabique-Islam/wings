CREATE OR REPLACE FUNCTION public.current_user_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(auth.jwt() ->> 'email', '');
$$;

CREATE OR REPLACE FUNCTION public.is_entry_owner(_entry_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.entries e
    WHERE e.id = _entry_id
      AND e.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.entry_owner_id(_entry_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.user_id
  FROM public.entries e
  WHERE e.id = _entry_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.has_entry_share_role(_entry_id uuid, _roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.entry_shares es
    WHERE es.entry_id = _entry_id
      AND es.role = ANY(_roles)
      AND (
        es.shared_with_user_id = auth.uid()
        OR es.shared_with_email = public.current_user_email()
      )
  );
$$;

DROP POLICY IF EXISTS "Shared users can view shared entries" ON public.entries;
CREATE POLICY "Shared users can view shared entries"
ON public.entries
FOR SELECT
TO authenticated
USING (public.has_entry_share_role(id, ARRAY['viewer','editor','admin']));

DROP POLICY IF EXISTS "Shared editors can update entries" ON public.entries;
CREATE POLICY "Shared editors can update entries"
ON public.entries
FOR UPDATE
TO authenticated
USING (public.has_entry_share_role(id, ARRAY['editor','admin']))
WITH CHECK (public.has_entry_share_role(id, ARRAY['editor','admin']));

DROP POLICY IF EXISTS "Shared admins can delete entries" ON public.entries;
CREATE POLICY "Shared admins can delete entries"
ON public.entries
FOR DELETE
TO authenticated
USING (public.has_entry_share_role(id, ARRAY['admin']));

DROP POLICY IF EXISTS "Entry owners can manage shares" ON public.entry_shares;
CREATE POLICY "Entry owners can manage shares"
ON public.entry_shares
FOR ALL
TO authenticated
USING (public.is_entry_owner(entry_id))
WITH CHECK (public.is_entry_owner(entry_id));

DROP POLICY IF EXISTS "Shared admins can add viewer or editor shares" ON public.entry_shares;
CREATE POLICY "Shared admins can add viewer or editor shares"
ON public.entry_shares
FOR INSERT
TO authenticated
WITH CHECK (
  role = ANY (ARRAY['viewer','editor'])
  AND public.has_entry_share_role(entry_id, ARRAY['admin'])
);

DROP POLICY IF EXISTS "Shared admins can update to viewer or editor" ON public.entry_shares;
CREATE POLICY "Shared admins can update to viewer or editor"
ON public.entry_shares
FOR UPDATE
TO authenticated
USING (
  created_by <> public.entry_owner_id(entry_id)
  AND public.has_entry_share_role(entry_id, ARRAY['admin'])
)
WITH CHECK (
  role = ANY (ARRAY['viewer','editor'])
  AND created_by <> public.entry_owner_id(entry_id)
);

DROP POLICY IF EXISTS "Shared admins can remove non-owner shares" ON public.entry_shares;
CREATE POLICY "Shared admins can remove non-owner shares"
ON public.entry_shares
FOR DELETE
TO authenticated
USING (
  created_by <> public.entry_owner_id(entry_id)
  AND public.has_entry_share_role(entry_id, ARRAY['admin'])
);

DROP POLICY IF EXISTS "Shared users can view their shares" ON public.entry_shares;
CREATE POLICY "Shared users can view their shares"
ON public.entry_shares
FOR SELECT
TO authenticated
USING (
  shared_with_user_id = auth.uid()
  OR shared_with_email = public.current_user_email()
);

ALTER VIEW public.shared_entries_view SET (security_invoker = on);

DROP TRIGGER IF EXISTS resolve_share_user_id_before_write ON public.entry_shares;
CREATE TRIGGER resolve_share_user_id_before_write
BEFORE INSERT OR UPDATE OF shared_with_email
ON public.entry_shares
FOR EACH ROW
EXECUTE FUNCTION public.resolve_share_user_id();

DROP TRIGGER IF EXISTS validate_share_role_before_write ON public.entry_shares;
CREATE TRIGGER validate_share_role_before_write
BEFORE INSERT OR UPDATE OF role
ON public.entry_shares
FOR EACH ROW
EXECUTE FUNCTION public.validate_share_role();

DROP TRIGGER IF EXISTS update_entries_updated_at ON public.entries;
CREATE TRIGGER update_entries_updated_at
BEFORE UPDATE ON public.entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON public.user_preferences;
CREATE TRIGGER update_user_preferences_updated_at
BEFORE UPDATE ON public.user_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();