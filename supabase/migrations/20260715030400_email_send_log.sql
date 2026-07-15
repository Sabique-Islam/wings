-- Per-user email send log, used by the send-email edge function to rate limit
-- share invites. Only the service role touches it (no anon/authenticated grants).
CREATE TABLE IF NOT EXISTS public.email_send_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_send_log_user_time_idx
  ON public.email_send_log (user_id, created_at DESC);

ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.email_send_log TO service_role;
