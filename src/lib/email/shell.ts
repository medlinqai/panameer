
/** Brand colours, from brief_F. Repeated as literals because email needs them inline. */
export const EMAIL_COLORS = {
  magenta: "#D72CD6",
  magentaDark: "#B324B2",
  ink: "#272334",
  body: "#4a4658",
  muted: "#8a8199",
  line: "#ece9f1",
  card: "#F0F7F8",
} as const;

export const PANAMEER_URL = "https://panameer.com";

export const UNSUBSCRIBE_PLACEHOLDER = "{{PANAMEER_UNSUBSCRIBE_URL}}";
const YOUTUBE_URL = "https://www.youtube.com/c/panameer";
const LINKEDIN_URL = "https://www.linkedin.com/company/panameer/";
const INSTAGRAM_URL = "https://www.instagram.com/onpanameer";

export const PANAMEER_ADDRESS =
  "Panameer Inc · 120 Palencia Village Dr, C-105 #162, Saint Augustine, FL 32095";

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const EMAIL_LOGO_INTRINSIC: Record<string, { w: number; h: number }> = {
  "panameer-lockup-ink.png": { w: 1642, h: 278 },
  /* The white-on-dark twin. Same geometry; no email uses it yet. */
  "panameer-lockup-white.png": { w: 1642, h: 278 },
  "panameer-new-on-light.png": { w: 524, h: 132 },
  "panameer-new-on-dark.png": { w: 529, h: 134 },
};

export const EMAIL_LOGO_WIDTH = 265;

/** The text wordmark shown whenever the image cannot be relied on to load. */
const WORDMARK = `<div style="font-size:22px;font-weight:800;letter-spacing:-.5px;color:${EMAIL_COLORS.ink};">Panameer</div>`;

const UNROUTABLE_HOST =
  /^(localhost|::1|0\.0\.0\.0|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|169\.254\.\d+\.\d+)$/i;
const UNROUTABLE_SUFFIX = /\.(local|localhost|internal|intranet|test|example|invalid)$/i;

export function isEmailFetchableUrl(url?: string | null): boolean {
  if (!url) return false;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return false;
  const host = u.hostname.toLowerCase();
  if (UNROUTABLE_HOST.test(host)) return false;
  if (UNROUTABLE_SUFFIX.test(host)) return false;
  return host.includes(".");
}

export function logoBlock(logoUrl?: string, width: number = EMAIL_LOGO_WIDTH): string {
  if (!isEmailFetchableUrl(logoUrl)) return WORDMARK;

  const src = escapeHtml(logoUrl!);
  const asset = logoUrl!.split("?")[0].split("#")[0].split("/").pop() ?? "";
  const intrinsic = EMAIL_LOGO_INTRINSIC[asset];
  const height = intrinsic
    ? ` height="${Math.round((width * intrinsic.h) / intrinsic.w)}"`
    : "";

  return `<img src="${src}" alt="Panameer" width="${width}"${height}
           style="display:block;border:0;outline:none;text-decoration:none;height:auto;width:${width}px;max-width:${width}px;">`;
}

/** The single magenta call to action. At most one per email. */
export function primaryButton(href: string, label: string): string {
  return `<a href="${href}"
     style="display:inline-block;background:${EMAIL_COLORS.magenta};color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 26px;border-radius:0;">
    ${escapeHtml(label)}
  </a>`;
}

/** The secondary action. Outline, never filled. */
export function ghostButton(href: string, label: string): string {
  return `<a href="${href}"
     style="display:inline-block;background:#ffffff;color:${EMAIL_COLORS.ink};text-decoration:none;font-weight:700;font-size:15px;padding:12px 25px;border-radius:0;border:1.5px solid ${EMAIL_COLORS.line};">
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
        `<span style="display:inline-block;border:1px solid ${EMAIL_COLORS.line};border-radius:0;padding:4px 12px;margin:0 6px 6px 0;font-size:13px;color:${EMAIL_COLORS.body};">${escapeHtml(
          s
        )}</span>`
    )
    .join("");
}

/** The footer, identical on every email in the suite. */
function footer(year: number): string {
  // FOOTER LINKS LOOK LIKE LINKS
  const link = (href: string, label: string) =>
    `<a href="${href}" style="color:${EMAIL_COLORS.magenta};text-decoration:underline;">${label}</a>`;
  const dot = `<span style="color:${EMAIL_COLORS.line};"> · </span>`;

  return `<tr><td style="padding:28px 40px 32px;">
    <hr style="border:0;border-top:1px solid ${EMAIL_COLORS.line};margin:0 0 18px;">
    <div style="font-size:16px;font-weight:800;letter-spacing:-.4px;color:${EMAIL_COLORS.ink};margin:0 0 10px;">Panameer</div>
    <p style="font-size:12px;line-height:1.9;color:${EMAIL_COLORS.muted};margin:0 0 10px;">
      ${""}
      ${link(PANAMEER_URL, "www.panameer.com")}${dot}${link(YOUTUBE_URL, "YouTube")}${dot}${link(
        LINKEDIN_URL,
        "LinkedIn"
      )}${dot}${link(INSTAGRAM_URL, "Instagram")}<br>
      ${link(UNSUBSCRIBE_PLACEHOLDER, "Unsubscribe")}${dot}${link(
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
Unsubscribe ${UNSUBSCRIBE_PLACEHOLDER} · Privacy ${PANAMEER_URL}/privacy · Contact Support ${PANAMEER_URL}/support/bug
${PANAMEER_ADDRESS}
© Panameer Inc ${year}`;
}

/** Wrap a body in the Panameer card. */
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
