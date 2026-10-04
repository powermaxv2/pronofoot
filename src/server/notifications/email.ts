import nodemailer, { type Transporter } from "nodemailer";
import { env } from "@/lib/env";

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  const server = env().EMAIL_SERVER;
  if (!server) return null;
  transporter ??= nodemailer.createTransport(server);
  return transporter;
}

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Gabarit HTML sobre aux couleurs de PronoFoot (compatible clients mail). */
export function emailLayout({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta?: { label: string; url: string };
}) {
  const button = cta
    ? `<p style="margin:28px 0 0"><a href="${escape(cta.url)}" style="background:#e8ff3a;color:#0a1405;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:999px;display:inline-block;font-family:Arial,sans-serif;text-transform:uppercase;letter-spacing:.06em;font-size:14px">${escape(cta.label)}</a></p>`
    : "";
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#07110b;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#e8f2eb">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:520px;background:#0c1d13;border:1px solid #1d3326;border-radius:18px;padding:32px" cellspacing="0" cellpadding="0"><tr><td>
<p style="margin:0 0 24px;font-size:26px;font-weight:800;letter-spacing:.02em">PRONO<span style="color:#e8ff3a">FOOT</span></p>
<h1 style="margin:0 0 12px;font-size:22px;line-height:1.25">${escape(title)}</h1>
<div style="font-size:16px;line-height:1.55;color:#b6c9bd">${body}</div>${button}
<p style="margin:32px 0 0;font-size:12px;color:#6f8a7b">Jeu gratuit entre amis, points virtuels uniquement. Vous pouvez désactiver ces e-mails dans vos paramètres.</p>
</td></tr></table></td></tr></table></body></html>`;
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  const t = getTransporter();
  if (!t) return false;
  await t.sendMail({ from: env().EMAIL_FROM, to, subject, html, text });
  return true;
}

export { escape as escapeHtml };
