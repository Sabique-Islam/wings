-- Server-side guards for local vault mode.

CREATE OR REPLACE FUNCTION public.protect_local_content_storage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.content_storage IS DISTINCT FROM NEW.content_storage
     AND auth.uid() IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'only the owner can change content storage mode';
  END IF;

  IF NEW.content_storage = 'local' THEN
    IF TG_OP = 'INSERT' THEN
      NEW.content := '';
      NEW.content_json := NULL;
    ELSE
      NEW.content := OLD.content;
      NEW.content_json := OLD.content_json;
    END IF;
  END IF;

  IF NEW.content_storage = 'local' AND NEW.share_token IS NOT NULL THEN
    NEW.share_token := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_local_content_storage ON public.entries;
CREATE TRIGGER protect_local_content_storage
  BEFORE INSERT OR UPDATE ON public.entries
  FOR EACH ROW EXECUTE FUNCTION public.protect_local_content_storage();

CREATE OR REPLACE FUNCTION public.block_share_local_entries()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.entries e
    WHERE e.id = NEW.entry_id AND e.content_storage = 'local'
  ) THEN
    RAISE EXCEPTION 'local entries cannot be shared';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS block_share_local_entries ON public.entry_shares;
CREATE TRIGGER block_share_local_entries
  BEFORE INSERT ON public.entry_shares
  FOR EACH ROW EXECUTE FUNCTION public.block_share_local_entries();
