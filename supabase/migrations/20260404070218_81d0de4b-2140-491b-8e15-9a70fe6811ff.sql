-- Create entry_shares table for granular sharing
CREATE TABLE public.entry_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES public.entries(id) ON DELETE CASCADE,
  shared_with_email text NOT NULL,
  shared_with_user_id uuid,
  role text NOT NULL DEFAULT 'viewer',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,
  UNIQUE(entry_id, shared_with_email)
);

-- Add validation trigger for role values
CREATE OR REPLACE FUNCTION public.validate_share_role()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.role NOT IN ('viewer', 'editor', 'admin') THEN
    RAISE EXCEPTION 'Invalid role: %. Must be viewer, editor, or admin', NEW.role;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_share_role_trigger
  BEFORE INSERT OR UPDATE ON public.entry_shares
  FOR EACH ROW EXECUTE FUNCTION public.validate_share_role();

ALTER TABLE public.entry_shares ENABLE ROW LEVEL SECURITY;

-- Entry owner can manage shares
CREATE POLICY "Entry owners can manage shares"
  ON public.entry_shares FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.entries WHERE id = entry_shares.entry_id AND user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.entries WHERE id = entry_shares.entry_id AND user_id = auth.uid())
  );

-- Users shared with can view their shares
CREATE POLICY "Shared users can view their shares"
  ON public.entry_shares FOR SELECT
  TO authenticated
  USING (
    shared_with_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR shared_with_user_id = auth.uid()
  );

-- Admins on shared entries can also manage shares
CREATE POLICY "Admins can manage sub-shares"
  ON public.entry_shares FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.entry_shares es
      WHERE es.entry_id = entry_shares.entry_id
        AND es.role = 'admin'
        AND (es.shared_with_user_id = auth.uid() OR es.shared_with_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.entry_shares es
      WHERE es.entry_id = entry_shares.entry_id
        AND es.role = 'admin'
        AND (es.shared_with_user_id = auth.uid() OR es.shared_with_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
    )
  );

-- Fix the shared entries RLS: require specific token match, not just IS NOT NULL
DROP POLICY IF EXISTS "Anyone can view shared entries" ON public.entries;

CREATE POLICY "Anyone can view entries by share token"
  ON public.entries FOR SELECT
  TO anon, authenticated
  USING (
    share_token IS NOT NULL 
    AND share_token = current_setting('request.headers', true)::json->>'x-share-token'
  );

-- Shared users can view entries shared with them
CREATE POLICY "Shared users can view shared entries"
  ON public.entries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.entry_shares es
      WHERE es.entry_id = entries.id
        AND (es.shared_with_user_id = auth.uid() OR es.shared_with_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
    )
  );

-- Shared editors/admins can update entries
CREATE POLICY "Shared editors can update entries"
  ON public.entries FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.entry_shares es
      WHERE es.entry_id = entries.id
        AND es.role IN ('editor', 'admin')
        AND (es.shared_with_user_id = auth.uid() OR es.shared_with_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
    )
  );

-- Shared admins can delete entries
CREATE POLICY "Shared admins can delete entries"
  ON public.entries FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.entry_shares es
      WHERE es.entry_id = entries.id
        AND es.role = 'admin'
        AND (es.shared_with_user_id = auth.uid() OR es.shared_with_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
    )
  );

-- Add UPDATE policy on journal-images storage
CREATE POLICY "Users can update their own images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'journal-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'journal-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Create a function to resolve share user IDs from email
CREATE OR REPLACE FUNCTION public.resolve_share_user_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  SELECT id INTO NEW.shared_with_user_id
  FROM auth.users
  WHERE email = NEW.shared_with_email;
  RETURN NEW;
END;
$$;

CREATE TRIGGER resolve_share_user_trigger
  BEFORE INSERT OR UPDATE ON public.entry_shares
  FOR EACH ROW EXECUTE FUNCTION public.resolve_share_user_id();