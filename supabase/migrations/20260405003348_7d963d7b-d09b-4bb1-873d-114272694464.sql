-- 1. Drop the broad ALL policy for shared admins
DROP POLICY IF EXISTS "Admins can manage sub-shares" ON entry_shares;

-- Admins can view shares on their entries
CREATE POLICY "Shared admins can view shares"
ON entry_shares FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM entry_shares es
    WHERE es.entry_id = entry_shares.entry_id
    AND es.role = 'admin'
    AND (es.shared_with_user_id = auth.uid() OR es.shared_with_email = (SELECT email FROM auth.users WHERE id = auth.uid())::text)
  )
);

-- Admins can only add viewer/editor shares (not admin)
CREATE POLICY "Shared admins can add viewer or editor shares"
ON entry_shares FOR INSERT TO authenticated
WITH CHECK (
  role IN ('viewer', 'editor')
  AND EXISTS (
    SELECT 1 FROM entry_shares es
    WHERE es.entry_id = entry_shares.entry_id
    AND es.role = 'admin'
    AND (es.shared_with_user_id = auth.uid() OR es.shared_with_email = (SELECT email FROM auth.users WHERE id = auth.uid())::text)
  )
);

-- Admins can update shares but not escalate to admin
CREATE POLICY "Shared admins can update to viewer or editor"
ON entry_shares FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM entry_shares es
    WHERE es.entry_id = entry_shares.entry_id
    AND es.role = 'admin'
    AND (es.shared_with_user_id = auth.uid() OR es.shared_with_email = (SELECT email FROM auth.users WHERE id = auth.uid())::text)
  )
)
WITH CHECK (role IN ('viewer', 'editor'));

-- Admins can remove shares
CREATE POLICY "Shared admins can remove shares"
ON entry_shares FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM entry_shares es
    WHERE es.entry_id = entry_shares.entry_id
    AND es.role = 'admin'
    AND (es.shared_with_user_id = auth.uid() OR es.shared_with_email = (SELECT email FROM auth.users WHERE id = auth.uid())::text)
  )
);

-- 2. Drop permissive anon SELECT on journal-images, add owner-scoped policy
DROP POLICY IF EXISTS "Anyone can view journal images" ON storage.objects;

CREATE POLICY "Users can view their own images"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'journal-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);