/**
 * THE SHARED EMAIL SHELL (brief_transactional_email_suite WS-A).
 *
 * Header, card, footer and the small helpers every template needs. Before this
 * each template carried its own copy of the table scaffold AND its own private
 * `escapeHtml` — five identical functions, which is five places for one of them
 * to quietly stop escaping something.
 *
 * INLINE STYLES ONLY, and tables for layout. Email clients strip <style> blocks
 * and most have no flexbox; this is the one place in the codebase where the
 * 1999 markup is correct rather than lazy.
 *
 * ONE MAGENTA PRIMARY PER EMAIL (E217). `primaryButton` is the only thing here
 * that emits a magenta fill; a second action uses `ghostButton`. The rule is the
 * same one the console follows, for the same reason: two solid buttons is not
 * emphasis, it is the absence of a decision.
 */

/** Brand colours, from brief_F. Repeated as literals because email needs them inline. */
export const EMAIL_COLORS = {
  magenta: "#D72CD6",
  magentaDark: "#B324B2",
  ink: "#181E3C",
  body: "#4a4658",
  muted: "#8a8199",
  line: "#ece9f1",
  card: "#F0F7F8",
} as const;

export const PANAMEER_URL = "https://panameer.com";
const YOUTUBE_URL = "https://www.youtube.com/c/panameer";
const LINKEDIN_URL = "https://www.linkedin.com/company/panameer/";
const INSTAGRAM_URL = "https://www.instagram.com/onpanameer";

/**
 * Postal address. A physical address is a CAN-SPAM requirement for commercial
 * mail, not decoration — and a placeholder that ships is worse than one that is
 * obviously unfinished, which is why it says so.
 */
export const PANAMEER_ADDRESS = "Panameer Inc · address to be confirmed";

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** The Panameer mark, falling back to the wordmark when no absolute URL exists. */
export function logoBlock(logoUrl?: string): string {
  return logoUrl
    ? `<img src="${logoUrl}" alt="Panameer" width="180" height="25"
           style="display:block;border:0;outline:none;text-decoration:none;height:auto;width:180px;max-width:180px;">`
    : `<div style="font-size:22px;font-weight:800;letter-spacing:-.5px;color:${EMAIL_COLORS.ink};">Panameer</div>`;
}

/** The single magenta call to action. At most one per email. */
export function primaryButton(href: string, label: string): string {
  return `<a href="${href}"
     style="display:inline-block;background:${EMAIL_COLORS.magenta};color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 26px;border-radius:999px;">
    ${escapeHtml(label)}
  </a>`;
}

/** The secondary action. Outline, never filled. */
export function ghostButton(href: string, label: string): string {
  return `<a href="${href}"
     style="display:inline-block;background:#ffffff;color:${EMAIL_COLORS.ink};text-decoration:none;font-weight:700;font-size:15px;padding:12px 25px;border-radius:999px;border:1.5px solid ${EMAIL_COLORS.line};">
    ${escapeHtml(label)}
  </a>`;
}

/** A labelled block — Description, Skills Needed, What's next. */
export function section(heading: string, bodyHtml: string): string {
  return `<p style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:${EMAIL_COLORS.muted};margin:24px 0 6px;">
    ${escapeHtml(heading)}
  </p>
  <div style="font-size:15px;line-height:1.6;color:${EMAIL_COLORS.body};margin:0;">${bodyHtml}</div>`;
}

/** Skills as inline pills. Falls back to nothing when the list is empty. */
export function chips(items: string[]): string {
  if (items.length === 0) return "";
  return items
    .map(
      (s) =>
        `<span style="display:inline-block;border:1px solid ${EMAIL_COLORS.line};border-radius:999px;padding:4px 12px;margin:0 6px 6px 0;font-size:13px;color:${EMAIL_COLORS.body};">${escapeHtml(
          s
        )}</span>`
    )
    .join("");
}

/**
 * The footer, identical on every email in the suite.
 *
 * UNSUBSCRIBE AND PRIVACY ARE NOT OPTIONAL. Both are legal furniture for bulk
 * mail and both were absent from every template before this. They point at real
 * routes — /privacy exists; /settings/notifications is where a signed-in person
 * actually turns email off, which is a truer "unsubscribe" than a link that
 * silently does nothing.
 */
function footer(year: number): string {
  const link = (href: string, label: string) =>
    `<a href="${href}" style="color:${EMAIL_COLORS.muted};text-decoration:none;">${label}</a>`;
  const dot = `<span style="color:${EMAIL_COLORS.line};"> · </span>`;

  return `<tr><td style="padding:28px 40px 32px;">
    <hr style="border:0;border-top:1px solid ${EMAIL_COLORS.line};margin:0 0 18px;">
    <div style="font-size:16px;font-weight:800;letter-spacing:-.4px;color:${EMAIL_COLORS.ink};margin:0 0 10px;">Panameer</div>
    <p style="font-size:12px;line-height:1.9;color:${EMAIL_COLORS.muted};margin:0 0 10px;">
      ${link(PANAMEER_URL, "panameer.com")}${dot}${link(YOUTUBE_URL, "YouTube")}${dot}${link(
        LINKEDIN_URL,
        "LinkedIn"
      )}${dot}${link(INSTAGRAM_URL, "Instagram")}<br>
      ${link(`${PANAMEER_URL}/settings/notifications`, "Unsubscribe")}${dot}${link(
        `${PANAMEER_URL}/privacy`,
        "Privacy"
      )}${dot}${link(`${PANAMEER_URL}/support/bug`, "Contact Support")}
    </p>
    <p style="font-size:12px;line-height:1.6;color:${EMAIL_COLORS.muted};margin:0;">
      ${PANAMEER_ADDRESS}<br>© Panameer Inc ${year}
    </p>
  </td></tr>`;
}

/** The plain-text twin of the footer. */
export function footerText(year: number): string {
  return `—
Panameer
${PANAMEER_URL} · YouTube ${YOUTUBE_URL} · LinkedIn ${LINKEDIN_URL} · Instagram ${INSTAGRAM_URL}
Unsubscribe ${PANAMEER_URL}/settings/notifications · Privacy ${PANAMEER_URL}/privacy · Contact Support ${PANAMEER_URL}/support/bug
${PANAMEER_ADDRESS}
© Panameer Inc ${year}`;
}

/**
 * Wrap a body in the Panameer card.
 *
 * `year` is injectable so a test can assert a fixed copyright line rather than
 * asserting against whatever year the suite happens to run in — the kind of
 * test that passes for eleven months and fails on New Year's Day.
 */
export function emailShell({
  logoUrl,
  bodyHtml,
  year = new Date().getFullYear(),
  width = 560,
}: {
  logoUrl?: string;
  bodyHtml: string;
  year?: number;
  width?: number;
}): string {
  return `<!doctype html>
<html>
  <head>
    <!-- E062 — declare the charset, or an em-dash or curly quote renders as
         mojibake wherever the client falls back to Latin-1. -->
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
  </head>
  <body style="margin:0;padding:0;background:${EMAIL_COLORS.card};font-family:Arial,Helvetica,sans-serif;color:${EMAIL_COLORS.ink};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${EMAIL_COLORS.card};padding:32px 0;">
      <tr><td align="center">
        <table role="presentation" width="${width}" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;border:1px solid ${EMAIL_COLORS.line};overflow:hidden;">
          <tr><td style="padding:32px 40px 8px;">
            ${logoBlock(logoUrl)}
          </td></tr>
          <tr><td style="padding:8px 40px 0;">
${bodyHtml}
          </td></tr>
          ${footer(year)}
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

/** `Hi Scott,` — the greeting every template in the suite opens with. */
export function greeting(name: string): string {
  return `<p style="font-size:15px;line-height:1.6;color:${EMAIL_COLORS.body};margin:0 0 16px;">Hi ${escapeHtml(
    name
  )},</p>`;
}

/** A body paragraph. */
export function paragraph(html: string): string {
  return `<p style="font-size:15px;line-height:1.6;color:${EMAIL_COLORS.body};margin:0 0 20px;">${html}</p>`;
}

/** The sign-off line. */
export function signOff(who: string): string {
  return `<p style="font-size:15px;line-height:1.6;color:${EMAIL_COLORS.body};margin:28px 0 0;">— ${escapeHtml(
    who
  )}</p>`;
}
