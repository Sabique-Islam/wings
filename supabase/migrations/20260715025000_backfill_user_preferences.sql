-- Backfill user_preferences for auth users missing a row (e.g. signed up before trigger).
INSERT INTO public.user_preferences (user_id, username)
SELECT
  u.id,
  'user_' || substr(replace(u.id::text, '-', ''), 1, 10)
FROM auth.users u
LEFT JOIN public.user_preferences p ON p.user_id = u.id
WHERE p.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Resolve any duplicate usernames from the simple backfill above.
DO $$
DECLARE
  r RECORD;
  new_name text;
  n int;
BEGIN
  FOR r IN
    SELECT user_id, username
    FROM public.user_preferences
    WHERE lower(username) IN (
      SELECT lower(username) FROM public.user_preferences GROUP BY lower(username) HAVING count(*) > 1
    )
  LOOP
    n := 1;
    LOOP
      new_name := r.username || n::text;
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM public.user_preferences WHERE lower(username) = lower(new_name)
      );
      n := n + 1;
    END LOOP;
    UPDATE public.user_preferences SET username = new_name WHERE user_id = r.user_id;
  END LOOP;
END $$;
