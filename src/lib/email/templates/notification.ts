import {
  emailShell,
  escapeHtml,
  footerText,
  primaryButton,
} from "@/lib/email/shell";

export function notificationEmail(input: {
  firstName?: string | null;
  title: string;
  body?: string | null;
  href?: string | null;
  logoUrl?: string;
}): { subject: string; html: string; text: string } {
  const base = (
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3100"
  ).replace(/\/+$/, "");

  const link = input.href
    ? /^https?:\/\//i.test(input.href)
      ? input.href
      : `${base}/${input.href.replace(/^\/+/, "")}`
    : null;

  const greeting = input.firstName
    ? `<p style="margin:0 0 16px;font-size:16px;">Hi ${escapeHtml(input.firstName)},</p>`
    : "";

  const bodyHtml = [
    greeting,
    `<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;">${escapeHtml(input.title)}</h1>`,
    input.body
      ? `<p style="margin:0 0 24px;font-size:16px;line-height:1.55;">${escapeHtml(input.body)}</p>`
      : "",
    link ? primaryButton(link, "Open in Panameer") : "",
  ]
    .filter(Boolean)
    .join("\n");

  // would print the footer twice in an HTML client. Caught by the compiler
  const year = new Date().getFullYear();
  const text = [
    input.firstName ? `Hi ${input.firstName},` : null,
    input.title,
    input.body ?? null,
    link ? `Open in Panameer: ${link}` : null,
    footerText(year),
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    // THE SUBJECT IS THE ROW'S TITLE. The registry already wrote the one
    subject: input.title,
    html: emailShell({ logoUrl: input.logoUrl, bodyHtml }),
    text,
  };
}
