// Supabase Auth "Send Email" hook — Resend SDK (html/text).
// Docs: https://resend.com/docs/send-with-nodejs

import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";
import {
  sendMagicLinkMail,
  sendNotificationMail,
  siteUrl,
  supabaseUrl,
} from "../_shared/mail.ts";

interface HookPayload {
  user: { id: string; email: string; new_email?: string };
  email_data: {
    token: string;
    token_hash: string;
    token_new?: string;
    token_hash_new?: string;
    redirect_to: string;
    email_action_type: string;
  };
}

function verifyUrl(tokenHash: string, actionType: string, redirectTo: string): string {
  const base = supabaseUrl();
  const params = new URLSearchParams({
    token: tokenHash,
    type: actionType,
    redirect_to: redirectTo || siteUrl(),
  });
  return `${base}/auth/v1/verify?${params.toString()}`;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), { status: 405 });
  }

  const secret = Deno.env.get("SEND_EMAIL_HOOK_SECRET");
  if (!secret) {
    return new Response(JSON.stringify({ error: "SEND_EMAIL_HOOK_SECRET not configured" }), { status: 503 });
  }

  const payload = await req.text();
  const headers = Object.fromEntries(req.headers);
  const hookSecret = secret.replace("v1,whsec_", "");
  const wh = new Webhook(hookSecret);

  try {
    const { user, email_data } = wh.verify(payload, headers) as HookPayload;
    const action = email_data.email_action_type;

    const notification = await sendNotificationMail({
      to: user.email,
      action,
      userId: user.id,
    });
    if (notification) {
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const redirectTo = email_data.redirect_to || siteUrl();

    if (action === "email_change" && user.new_email && email_data.token_new && email_data.token_hash_new) {
      await sendMagicLinkMail({
        to: user.email,
        action,
        verifyUrl: verifyUrl(email_data.token_hash_new, action, redirectTo),
        token: email_data.token,
        userId: user.id,
        tokenHash: email_data.token_hash_new,
      });
      await sendMagicLinkMail({
        to: user.new_email,
        action,
        verifyUrl: verifyUrl(email_data.token_hash, action, redirectTo),
        token: email_data.token_new,
        userId: user.id,
        tokenHash: email_data.token_hash,
      });
    } else {
      const recipient = action === "email_change" && user.new_email ? user.new_email : user.email;
      await sendMagicLinkMail({
        to: recipient,
        action,
        verifyUrl: verifyUrl(email_data.token_hash, action, redirectTo),
        token: email_data.token_new || email_data.token,
        userId: user.id,
        tokenHash: email_data.token_hash,
      });
    }

    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("auth-send-email:", e);
    const err = e as { message?: string };
    return new Response(
      JSON.stringify({ error: { http_code: 500, message: err.message ?? "send failed" } }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }
});
