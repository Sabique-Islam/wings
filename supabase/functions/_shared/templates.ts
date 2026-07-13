const mono = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
const sans = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

function shell(preheader: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f4f2ef;color:#1a1a1a;font-family:${sans};">
<span style="display:none;max-height:0;overflow:hidden;">${preheader}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2ef;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border:1px solid #e4e0da;border-radius:12px;">
<tr><td style="padding:28px 28px 8px;font-family:${mono};font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:#6b6560;">wings</td></tr>
<tr><td style="padding:8px 28px 28px;">${body}</td></tr>
<tr><td style="padding:0 28px 24px;font-family:${mono};font-size:10px;color:#9a948c;line-height:1.6;">mail.wings.nopejs.me · think in plain text</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function btn(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;margin:20px 0 8px;padding:12px 22px;background:#1a1a1a;color:#fff;text-decoration:none;border-radius:999px;font-family:${mono};font-size:11px;letter-spacing:0.16em;text-transform:uppercase;">${label}</a>`;
}

function codeBlock(value: string): string {
  return `<div style="margin:16px 0;padding:14px 16px;background:#f4f2ef;border:1px solid #e4e0da;border-radius:8px;font-family:${mono};font-size:22px;letter-spacing:0.35em;text-align:center;">${value}</div>`;
}

export function magicLinkTemplate(opts: {
  heading: string;
  lead: string;
  verifyUrl: string;
  token: string;
}): { subject: string; html: string; text: string } {
  const body = `
<h1 style="margin:0 0 12px;font-size:24px;line-height:1.15;letter-spacing:-0.03em;font-weight:700;">${opts.heading}</h1>
<p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#4a4540;">${opts.lead}</p>
${btn(opts.verifyUrl, "open wings")}
<p style="margin:18px 0 6px;font-size:13px;color:#6b6560;">or paste this one-time code:</p>
${codeBlock(opts.token)}
<p style="margin:16px 0 0;font-size:12px;color:#9a948c;">if you didn't request this, ignore this email.</p>`;
  return {
    subject: opts.heading,
    html: shell(opts.lead, body),
    text: `${opts.heading}\n\n${opts.lead}\n\n${opts.verifyUrl}\n\nCode: ${opts.token}\n`,
  };
}

export function notificationTemplate(opts: {
  heading: string;
  body: string;
  subject: string;
}): { subject: string; html: string; text: string } {
  const htmlBody = `
<h1 style="margin:0 0 12px;font-size:22px;font-weight:700;">${opts.heading}</h1>
<p style="margin:0;font-size:15px;line-height:1.6;color:#4a4540;">${opts.body}</p>`;
  return {
    subject: opts.subject,
    html: shell(opts.body, htmlBody),
    text: `${opts.heading}\n\n${opts.body}\n`,
  };
}

export function shareInviteTemplate(opts: {
  inviterLabel: string;
  entryTitle: string;
  role: string;
  url: string;
}): { subject: string; html: string; text: string } {
  const title = opts.entryTitle.trim() || "a note";
  const body = `
<h1 style="margin:0 0 12px;font-size:24px;font-weight:700;">you've been invited</h1>
<p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#4a4540;">${opts.inviterLabel} shared <strong>${title}</strong> with you as <strong>${opts.role}</strong>.</p>
${btn(opts.url, "open note")}
<p style="margin:16px 0 0;font-size:12px;color:#9a948c;word-break:break-all;">${opts.url}</p>`;
  return {
    subject: `${opts.inviterLabel} shared a note with you`,
    html: shell(`Open ${title} on Wings`, body),
    text: `You've been invited to ${title} (${opts.role}) by ${opts.inviterLabel}.\n\n${opts.url}\n`,
  };
}

export function authCopy(action: string): { heading: string; lead: string; subject: string } {
  switch (action) {
    case "signup":
      return { heading: "welcome to wings", lead: "confirm your email to start writing.", subject: "welcome to wings" };
    case "recovery":
      return { heading: "reset your sign-in", lead: "use this link or code to get back into wings.", subject: "reset your wings sign-in" };
    case "email_change":
      return { heading: "confirm your new email", lead: "approve this change to update your wings account.", subject: "confirm your new email" };
    case "invite":
      return { heading: "you're invited to wings", lead: "accept the invite to join.", subject: "you're invited to wings" };
    default:
      return { heading: "your sign-in link", lead: "tap below to open wings — no password needed.", subject: "your wings sign-in link" };
  }
}

export function notificationCopy(action: string): { heading: string; body: string; subject: string } | null {
  switch (action) {
    case "password_changed_notification":
      return { heading: "password changed", body: "your wings password was changed. if this wasn't you, contact support immediately.", subject: "your wings password changed" };
    case "email_changed_notification":
      return { heading: "email changed", body: "the email on your wings account was updated.", subject: "your wings email changed" };
    case "phone_changed_notification":
      return { heading: "phone changed", body: "the phone number on your wings account was updated.", subject: "your wings phone changed" };
    case "identity_linked_notification":
      return { heading: "sign-in method linked", body: "a new sign-in method was linked to your wings account.", subject: "new sign-in method linked" };
    case "identity_unlinked_notification":
      return { heading: "sign-in method removed", body: "a sign-in method was removed from your wings account.", subject: "sign-in method removed" };
    case "mfa_factor_enrolled_notification":
      return { heading: "two-factor enabled", body: "a new two-factor method was added to your wings account.", subject: "two-factor enabled" };
    case "mfa_factor_unenrolled_notification":
      return { heading: "two-factor removed", body: "a two-factor method was removed from your wings account.", subject: "two-factor removed" };
    case "reauthentication":
      return { heading: "confirm it's you", body: "re-authentication was requested on your wings account.", subject: "confirm your wings account" };
    default:
      return null;
  }
}
