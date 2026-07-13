ALTER TABLE public.entries ADD COLUMN share_token text UNIQUE DEFAULT NULL;

CREATE POLICY "Anyone can view shared entries"
ON public.entries
FOR SELECT
TO anon, authenticated
USING (share_token IS NOT NULL);