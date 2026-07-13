-- Make journal-images bucket private
UPDATE storage.buckets SET public = false WHERE id = 'journal-images';

-- Create restricted view for shared entries (no user_id/parent_id exposure)
CREATE OR REPLACE VIEW public.shared_entries_view AS
SELECT id, title, content, created_at, share_token
FROM entries
WHERE share_token IS NOT NULL;

GRANT SELECT ON public.shared_entries_view TO anon, authenticated;