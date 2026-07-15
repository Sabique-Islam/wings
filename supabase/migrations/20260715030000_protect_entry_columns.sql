-- Security hardening: freeze sensitive entry columns for non-owners and soften
-- the parent_id cascade so a hostile reparent can't nuke another user's tree.

-- 1) parent_id FK: CASCADE -> SET NULL (defense-in-depth vs cascade delete).
DO $$
DECLARE
  fk_name text;
BEGIN
  SELECT conname INTO fk_name
  FROM pg_constraint
  WHERE conrelid = 'public.entries'::regclass
    AND contype = 'f'
    AND conkey = (
      SELECT array_agg(attnum)
      FROM pg_attribute
      WHERE attrelid = 'public.entries'::regclass
        AND attname = 'parent_id'
    );

  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.entries DROP CONSTRAINT %I', fk_name);
  END IF;

  ALTER TABLE public.entries
    ADD CONSTRAINT entries_parent_id_fkey
    FOREIGN KEY (parent_id) REFERENCES public.entries(id) ON DELETE SET NULL;
END $$;

-- 2) Guard trigger: user_id is immutable for everyone; only the owner may change
-- share_token or parent_id. Shared editors (who have UPDATE via RLS) therefore
-- cannot steal ownership, hijack the public link, or move the page out of the
-- owner's tree. service_role (trusted backend) is exempt.
CREATE OR REPLACE FUNCTION public.protect_entry_sensitive_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Ownership can never be reassigned through the API.
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'user_id cannot be modified';
  END IF;

  IF auth.uid() IS DISTINCT FROM OLD.user_id THEN
    IF NEW.share_token IS DISTINCT FROM OLD.share_token THEN
      RAISE EXCEPTION 'only the owner can change the share token';
    END IF;
    IF NEW.parent_id IS DISTINCT FROM OLD.parent_id THEN
      RAISE EXCEPTION 'only the owner can move this entry';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_entry_sensitive_columns ON public.entries;
CREATE TRIGGER protect_entry_sensitive_columns
BEFORE UPDATE ON public.entries
FOR EACH ROW
EXECUTE FUNCTION public.protect_entry_sensitive_columns();
