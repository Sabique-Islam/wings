import { supabase } from "@/integrations/supabase/client";

// The server derives the invite URL, role, and title from the database; we only
// pass the entry id and recipient.
export async function sendShareInviteEmail(opts: {
  to: string;
  entryId: string;
}): Promise<{ error: string | null }> {
  const { error } = await supabase.functions.invoke("send-email", {
    body: {
      type: "share_invite",
      to: opts.to,
      entry_id: opts.entryId,
    },
  });

  if (error) return { error: error.message };
  return { error: null };
}
