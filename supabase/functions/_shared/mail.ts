/// <reference path="../deno.ns.d.ts" />

import { Resend } from "npm:resend@^6";
import {
  authCopy,
  magicLinkTemplate,
  notificationCopy,
  notificationTemplate,
  shareInviteTemplate,
} from "./templates.ts";

let client: Resend | null = null;
let configChecked = false;

/** Fail closed in production when required mail env vars are missing. */
function assertMailConfig(): void {
  if (configChecked) return;
  configChecked = true;
  const isProd = !!Deno.env.get("DENO_DEPLOYMENT_ID");
  if (!isProd) return;
  const missing: string[] = [];
  if (!Deno.env.get("SITE_URL")) missing.push("SITE_URL");
  if (!Deno.env.get("MAIL_FROM_AUTH")) missing.push("MAIL_FROM_AUTH");
  if (!Deno.env.get("MAIL_FROM_APP")) missing.push("MAIL_FROM_APP");
  if (!Deno.env.get("RESEND_API_KEY")) missing.push("RESEND_API_KEY");
  if (missing.length > 0) {
    throw new Error(`mail configuration incomplete: ${missing.join(", ")}`);
  }
}

function getResend(): Resend {
  assertMailConfig();
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) throw new Error("RESEND_API_KEY not configured");
  if (!client) client = new Resend(key);
  return client;
}

export function mailFromAuth(): string {
  return Deno.env.get("MAIL_FROM_AUTH") || "Wings <auth@mail.wings.nopejs.me>";
}

export function mailFromApp(): string {
  return Deno.env.get("MAIL_FROM_APP") || "Wings <hello@mail.wings.nopejs.me>";
}

export function replyTo(): string {
  return Deno.env.get("MAIL_REPLY_TO") || "hello@mail.wings.nopejs.me";
}

export function siteUrl(): string {
  return Deno.env.get("SITE_URL") || "https://wings.nopejs.me";
}

export function supabaseUrl(): string {
  return Deno.env.get("SUPABASE_URL") || "";
}

interface SendOptions {
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  idempotencyKey?: string;
  tags?: { name: string; value: string }[];
}

/** Send via Resend SDK — https://resend.com/docs/send-with-nodejs */
async function sendMail(opts: SendOptions): Promise<{ id: string } | { error: string }> {
  const { data, error } = await getResend().emails.send(
    {
      from: opts.from,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      replyTo: replyTo(),
      tags: opts.tags,
    },
    opts.idempotencyKey ? { idempotencyKey: opts.idempotencyKey } : undefined,
  );

  if (error) return { error: error.message };
  if (!data?.id) return { error: "Resend returned no message id" };
  return { id: data.id };
}

function assertSent(result: { id: string } | { error: string }): { id: string } {
  if ("error" in result) throw new Error(result.error);
  return result;
}

export async function sendMagicLinkMail(opts: {
  to: string;
  action: string;
  verifyUrl: string;
  userId: string;
  tokenHash: string;
}) {
  const copy = authCopy(opts.action);
  const mail = magicLinkTemplate({
    heading: copy.heading,
    lead: copy.lead,
    verifyUrl: opts.verifyUrl,
  });

  return assertSent(await sendMail({
    from: mailFromAuth(),
    to: opts.to,
    subject: copy.subject,
    html: mail.html,
    text: mail.text,
    idempotencyKey: `auth/${opts.action}/${opts.userId}/${opts.tokenHash}`.slice(0, 256),
    tags: [
      { name: "category", value: "auth" },
      { name: "action", value: opts.action },
    ],
  }));
}

export async function sendNotificationMail(opts: {
  to: string;
  action: string;
  userId: string;
}) {
  const copy = notificationCopy(opts.action);
  if (!copy) return null;

  const mail = notificationTemplate(copy);
  return assertSent(await sendMail({
    from: mailFromAuth(),
    to: opts.to,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    idempotencyKey: `auth-notify/${opts.action}/${opts.userId}`.slice(0, 256),
    tags: [
      { name: "category", value: "auth" },
      { name: "action", value: opts.action },
    ],
  }));
}

export async function sendShareInviteMail(opts: {
  to: string;
  inviterLabel: string;
  entryTitle: string;
  role: string;
  url: string;
  entryId: string;
}) {
  const mail = shareInviteTemplate({
    inviterLabel: opts.inviterLabel,
    entryTitle: opts.entryTitle,
    role: opts.role,
    url: opts.url,
  });

  return assertSent(await sendMail({
    from: mailFromApp(),
    to: opts.to,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    idempotencyKey: `share-invite/${opts.entryId}/${opts.to}`.slice(0, 256),
    tags: [
      { name: "category", value: "share" },
      { name: "entry_id", value: opts.entryId.slice(0, 256) },
    ],
  }));
}
