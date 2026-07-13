-- 1. Fix email exposure: admins should only see their own share record
DROP POLICY IF EXISTS "Shared admins can view shares" ON entry_shares;

-- No replacement needed — "Shared users can view their shares" already lets
-- any shared user (including admins) see their own record.

-- 2. Fix admin DELETE: prevent deleting shares created by the entry owner
DROP POLICY IF EXISTS "Shared admins can remove shares" ON entry_shares;

CREATE POLICY "Shared admins can remove non-owner shares"
ON entry_shares FOR DELETE TO authenticated
USING (
  -- The share being deleted must NOT have been created by the entry owner
  created_by != (SELECT e.user_id FROM entries e WHERE e.id = entry_shares.entry_id)
  AND EXISTS (
    SELECT 1 FROM entry_shares es
    WHERE es.entry_id = entry_shares.entry_id
    AND es.role = 'admin'
    AND (es.shared_with_user_id = auth.uid() OR es.shared_with_email = (SELECT email FROM auth.users WHERE id = auth.uid())::text)
  )
);

-- 3. Fix realtime channel auth: remove entries from realtime publication
-- (solo-first app; realtime was added for live editing but exposes channel subscriptions)
ALTER PUBLICATION supabase_realtime DROP TABLE entries;