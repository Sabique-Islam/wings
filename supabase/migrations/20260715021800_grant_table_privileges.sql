-- Early migrations enabled RLS but never granted table privileges to API roles.
-- Without these, PostgREST returns "permission denied for table …".

GRANT SELECT, INSERT, UPDATE, DELETE ON public.entries TO authenticated;
GRANT SELECT ON public.entries TO anon;
GRANT ALL ON public.entries TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.entry_shares TO authenticated;
GRANT ALL ON public.entry_shares TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_preferences TO authenticated;
GRANT SELECT ON public.user_preferences TO anon;
GRANT ALL ON public.user_preferences TO service_role;
