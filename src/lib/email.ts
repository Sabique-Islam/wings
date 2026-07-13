import { supabase } from "@/integrations/supabase/client";

export async function sendShareInviteEmail(opts: {
  to: string;
  entryId: string;
  entryTitle: string;
  role: string;
  url: string;
}): Promise<{ error: string | null }> {
  const { error } = await supabase.functions.invoke("send-email", {
    body: {
      type: "share_invite",
      to: opts.to,
      entry_id: opts.entryId,
      entry_title: opts.entryTitle,
      role: opts.role,
      url: opts.url,
    },
  });

  if (error) return { error: error.message };
  return { error: null };
}
