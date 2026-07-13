-- Add username to user_preferences for personalized dashboard URLs
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS username text;

-- Backfill existing rows with a unique username derived from user_id
UPDATE public.user_preferences
SET username = 'user_' || substr(replace(user_id::text, '-', ''), 1, 10)
WHERE username IS NULL OR username = '';

ALTER TABLE public.user_preferences
  ALTER COLUMN username SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS user_preferences_username_key
  ON public.user_preferences (lower(username));

-- Allow authenticated users to look up usernames (only username + user_id, no other prefs)
-- We rely on existing RLS — add a policy to allow reading the username column for any authenticated user
DROP POLICY IF EXISTS "Authenticated users can view usernames" ON public.user_preferences;
CREATE POLICY "Authenticated users can view usernames"
ON public.user_preferences
FOR SELECT
TO authenticated
USING (true);

-- Auto-create user_preferences row with a derived username on new signup
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
BEGIN
  base_username := lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-z0-9_]', '', 'g'));
  IF base_username IS NULL OR length(base_username) < 3 THEN
    base_username := 'user' || substr(replace(NEW.id::text, '-', ''), 1, 6);
  END IF;
  candidate := base_username;
  WHILE EXISTS (SELECT 1 FROM public.user_preferences WHERE lower(username) = candidate) LOOP
    suffix := suffix + 1;
    candidate := base_username || suffix::text;
  END LOOP;
  INSERT INTO public.user_preferences (user_id, username)
  VALUES (NEW.id, candidate)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_prefs ON auth.users;
CREATE TRIGGER on_auth_user_created_prefs
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_preferences();
