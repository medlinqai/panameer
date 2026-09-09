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
  ink: "#272334",
  body: "#4a4658",
  muted: "#8a8199",
  line: "#ece9f1",
  card: "#F0F7F8",
} as const;

export const PANAMEER_URL = "https://panameer.com";

/**
 * ⚠⚠ THE FOOTER'S UNSUBSCRIBE HREF, RESOLVED BY THE TRANSPORT (`P1-ALL-E386`).
 *
 * A literal sentinel rather than a template parameter, because every one of the
 * thirteen templates would otherwise need a new required argument threaded
 * through it — and the one that got missed would ship a broken footer silently.
 * `check:unsubscribe` asserts every rendered email contains it.
 */
export const UNSUBSCRIBE_PLACEHOLDER = "{{PANAMEER_UNSUBSCRIBE_URL}}";
const YOUTUBE_URL = "https://www.youtube.com/c/panameer";
const LINKEDIN_URL = "https://www.linkedin.com/company/panameer/";
const INSTAGRAM_URL = "https://www.instagram.com/onpanameer";

/**
 * Postal address. A physical address is a CAN-SPAM requirement for commercial
 * mail, not decoration — and a placeholder that ships is worse than one that is
 * obviously unfinished, which is why it used to say so.
 *
 * ── ⚠ SUPPLIED BY SCOTT 2026-09-09. `E402` WS-3 IS CLOSED ───────────────────
 *
 * ⚠ SUPERSEDED, quoted not deleted, because the reasoning is what kept the
 * value honest until it could be real:
 *
 *   *"⚠⚠ THIS IS STILL A PLACEHOLDER AND IT IS IN DELIVERED MAIL. It sits in
 *   the footer of every email Panameer sends, including the verification email
 *   — the one message where looking real matters most. ⚠⚠ THE VALUE IS SCOTT'S
 *   TO SUPPLY AND IS DELIBERATELY NOT INVENTED HERE. A plausible-looking
 *   address that is not Panameer's registered one is a worse outcome than an
 *   obviously unfinished one: it is a false statement of fact in a
 *   legally-required field. ⚠ SO `check:email-shell` FAILS ON IT, BY DESIGN,
 *   and goes green the moment this line becomes a real address."*
 *
 * ⚠⚠ THE GUARD DOES NOT RETIRE WITH THE PLACEHOLDER, AND THAT IS THE POINT.
 * `check:email-shell` §3 still refuses "to be confirmed", "TBD", "TODO", "TBA",
 * "xxx", "coming soon", "placeholder" and "lorem" in this constant, and still
 * refuses an empty or trivially-short value. A tripwire that is removed once it
 * is satisfied protects nothing; this one now has to SURVIVE being satisfied,
 * which is the only state in which it is worth anything.
 *
 * ⚠ THIS IS THE REGISTERED AGENT / PHYSICAL MAILING ADDRESS — what the footer
 * and CAN-SPAM ask for. It is not a contact route: support is reached through
 * the footer's Contact Support link, which is a different thing and stays.
 *
 * ⚠ NO HTML-SPECIAL CHARACTERS. It is interpolated raw into the HTML footer
 * (`&`, `<`, `>`, `"` would need escaping) and printed verbatim in the plain
 * text twin. `#` and `·` are safe in both; a future edit that introduces an
 * ampersand must escape it here or in `footer()`.
 */
export const PANAMEER_ADDRESS =
  "Panameer Inc · 120 Palencia Village Dr, C-105 #162, Saint Augustine, FL 32095";

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * ── ⚠⚠ THE MARKS AN EMAIL MAY HOTLINK, AT THEIR TRUE PIXEL SIZE ────────────
 *
 * `P1-ALL-E402` WS-2. These are MEASUREMENTS OF THE FILES, not layout choices —
 * `check:email-shell` opens each PNG, reads its IHDR header and fails if this
 * table and the file disagree. That is the whole point: **the rendered height
 * below is arithmetic on these numbers, so there is no second number anybody can
 * type wrong.**
 *
 * ⚠⚠ WHAT WAS THERE BEFORE: `width="180" height="25"`. The asset is 524×132, so
 * at 180 wide it is **45px tall, not 25**. The inline `height:auto` rescues most
 * clients; ⚠ OUTLOOK HONOURS THE ATTRIBUTE WHILE LOADING and reserves a box 20px
 * too short, which is the jump Scott would see every time.
 *
 * ⚠ THE TWO ASSETS ARE NOT THE SAME SHAPE — 524×132 and 529×134 — so ONE
 * hardcoded height was always going to be wrong for one of them. A per-asset
 * ratio is not over-engineering; it is the minimum that can be right.
 *
 * ⚠⚠ AND THIS IS THE THIRD PLACE THIS BUG HAS LIVED. `E397` found hardcoded
 * dimensions in `Logo.tsx` and `MarketingFooter`; `E400` had to reset both again
 * when the aspect changed. Deriving is what stops a fourth.
 */
export const EMAIL_LOGO_INTRINSIC: Record<string, { w: number; h: number }> = {
  "panameer-new-on-light.png": { w: 524, h: 132 },
  "panameer-new-on-dark.png": { w: 529, h: 134 },
};

/** The rendered width of the mark in the email header. */
export const EMAIL_LOGO_WIDTH = 180;

/** The text wordmark shown whenever the image cannot be relied on to load. */
const WORDMARK = `<div style="font-size:22px;font-weight:800;letter-spacing:-.5px;color:${EMAIL_COLORS.ink};">Panameer</div>`;

/*
  ── ⚠⚠ HOSTS A MAIL CLIENT'S SERVERS CANNOT REACH ───────────────────────────

  Loopback, the three RFC-1918 private ranges, link-local, and the reserved
  special-use TLDs. ⚠ `::1` is matched bare because `new URL()` strips the
  brackets off `[::1]` when it fills `hostname`.
*/
const UNROUTABLE_HOST =
  /^(localhost|::1|0\.0\.0\.0|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|169\.254\.\d+\.\d+)$/i;
const UNROUTABLE_SUFFIX = /\.(local|localhost|internal|intranet|test|example|invalid)$/i;

/**
 * ── ⚠⚠ CAN A MAIL CLIENT ACTUALLY FETCH THIS? (`P1-ALL-E402` WS-1) ─────────
 *
 * SCOTT opened a live verification email and saw a broken-image box. ⚠ THE
 * DIAGNOSIS IS DEV-ONLY BUT THE DEFECT IS NOT: `env.ts:104` defaults
 * `NEXT_PUBLIC_APP_URL` to `http://localhost:3100`, so a dev email ships
 * `<img src="http://localhost:3100/brand/…">`. **Outlook proxies remote images
 * SERVER-SIDE, and its servers have no route to a laptop.** In production the
 * variable is the real domain and the image loads.
 *
 * ⚠⚠ THE FALLBACK ALREADY EXISTED AND WAS WIRED WRONG. `logoBlock` branched on
 * the URL being **ABSENT**. In dev the URL is **present-and-unfetchable**, which
 * is the one case the old test could not see — so every dev email showed a
 * broken box instead of the wordmark the code already had.
 *
 * ⚠ THE CONSEQUENCE IS NOT COSMETIC: NOBODY COULD VISUALLY TEST EMAIL. Every
 * report of testing this surface was a report of looking at a broken box.
 *
 * ── ⚠⚠ THE RULE, AND WHY IT IS NOT THE OTHER ONE ───────────────────────────
 *
 * **The test is PUBLIC ROUTABILITY OF THE HOST, not the scheme.**
 *
 * ⚠ THE REJECTED ALTERNATIVE IS "not localhost". It passes
 * `http://192.168.1.14:3100` — which is exactly how this app gets opened when a
 * dev tests mail from a phone on the same wifi — and ships the same broken box
 * this row exists to remove. It fixes the one host somebody thought of.
 *
 * ⚠ THE OTHER REJECTED ALTERNATIVE IS "https, or else fall back". It is the one
 * that goes wrong in STAGING: a staging box on `http://staging.panameer.com` is
 * perfectly reachable by Outlook's proxy, so requiring TLS would hide a logo
 * that renders — and staging is precisely where somebody is trying to look at
 * the logo. ⚠⚠ SCHEME IS A TRANSPORT PROPERTY; REACHABILITY IS THE QUESTION
 * BEING ASKED. `http:` and `https:` both pass; everything else (`file:`,
 * `data:`, a relative path) does not.
 *
 * ⚠ A BARE HOSTNAME WITH NO DOT IS REFUSED. `http://buildbox:3100` resolves only
 * inside somebody's network; a public host is a FQDN.
 */
export function isEmailFetchableUrl(url?: string | null): boolean {
  if (!url) return false;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    /* ⚠ A RELATIVE PATH LANDS HERE, and it must fail: `/brand/x.png` in an
       email resolves against the mail client, which serves nothing. */
    return false;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return false;
  const host = u.hostname.toLowerCase();
  if (UNROUTABLE_HOST.test(host)) return false;
  if (UNROUTABLE_SUFFIX.test(host)) return false;
  return host.includes(".");
}

/**
 * The Panameer mark, falling back to the text wordmark whenever the image
 * cannot be relied on to load.
 *
 * ⚠ THE HEIGHT ATTRIBUTE IS DERIVED, never typed — see `EMAIL_LOGO_INTRINSIC`.
 * ⚠⚠ AN UNRECOGNISED ASSET EMITS **NO** HEIGHT ATTRIBUTE rather than a guessed
 * one. `height:auto` then governs everywhere, and Outlook reserves a box from
 * the width alone: no reservation is a smaller error than a wrong reservation,
 * which is the error being fixed. `check:email-shell` asserts every URL the
 * senders actually build names an asset in the table, so "unrecognised" cannot
 * ship quietly.
 */
export function logoBlock(logoUrl?: string, width: number = EMAIL_LOGO_WIDTH): string {
  if (!isEmailFetchableUrl(logoUrl)) return WORDMARK;

  /* ⚠ ESCAPED. `appBaseUrl(origin)` will hand back a request-derived origin, so
     this string is not always a compile-time constant, and it is interpolated
     into a quoted attribute. */
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
 * mail and both were absent from every template before this.
 *
 * ── ⚠⚠ CORRECTED 2026-09-04 (`P1-ALL-E386`). SUPERSEDED, QUOTED NOT DELETED ──
 *
 * This docblock used to finish: *"/settings/notifications is where a signed-in
 * person actually turns email off, which is a truer 'unsubscribe' than a link
 * that silently does nothing."*
 *
 * ⚠ THAT WAS HALF RIGHT, AND THE WRONG HALF WAS THE LEGALLY LOAD-BEARING ONE.
 * True for a signed-in PROVIDER. False for everyone else: `route-access.ts:59`
 * gates `/settings` behind `canProvideServices`, so a BUYER clicking Unsubscribe
 * was BOUNCED, a SIGNED-OUT recipient was bounced, and an address with no
 * account had no page at all.
 *
 * ⚠⚠ AND `E371` MADE IT LIVE. Seven senders now deliver for real, so this was
 * no longer a dead link in a drawer — it was a dead unsubscribe in DELIVERED
 * mail, which is how a sending domain gets blocked. `mail.panameer.com` has no
 * reputation yet to spend.
 *
 * ⚠ SO THE FOOTER NOW CARRIES A PLACEHOLDER, AND THE TRANSPORT RESOLVES IT to a
 * per-recipient signed link. It cannot be resolved here: templates are
 * recipient-agnostic — `footer()` takes only a year — and only `sendEmail()`
 * knows `to`.
 */
function footer(year: number): string {
  /*
    ── ⚠⚠ FOOTER LINKS LOOK LIKE LINKS (`P2-J1.1-E017`) ────────────────────────

    ⚠ SUPERSEDED, quoted not deleted:
      `style="color:${EMAIL_COLORS.muted};text-decoration:none;"`
    — grey (#8a8199) with the underline EXPLICITLY REMOVED.

    SCOTT, on his own received mail: *"then at least make a pink hyperlink. that
    way i know they re links...not just dead text."* His diagnosis was exactly
    right, and the code was worse than he thought: these were never dead text,
    they were LIVE LINKS WEARING A DISGUISE.

    ⚠⚠ THE UNDERLINE IS RESTORED **AS WELL AS** THE COLOUR, not instead of it.
    Colour as the sole affordance fails colour-blind readers, and grey→magenta is
    a HUE shift more than a contrast one — the two most common forms of colour
    blindness are exactly the ones that flatten it. The underline is the
    affordance that survives; the colour is what makes it noticeable.

    ⚠ NO ICONS, AND THIS IS EVIDENCE-BASED. Scott's received email had its images
    BLOCKED BY OUTLOOK and the Panameer wordmark rendered as an empty box. Today
    this footer degrades to readable words; as icons it would degrade to nothing.

    ⚠⚠ `primaryButton`'s *"at most one magenta call to action per email"* IS NOT
    BROKEN BY THIS, AND THE READING IS DELIBERATE RATHER THAN CONVENIENT. That
    sentence is `primaryButton`'s OWN docblock, and this module's header frames
    the rule as being about SOLID FILLS — *"a second action uses `ghostButton`
    … two solid buttons is not emphasis, it is the absence of a decision."* It
    governs which control is THE action, not what colour a text link may be.
    There is still exactly one filled magenta button per email.
  */
  const link = (href: string, label: string) =>
    `<a href="${href}" style="color:${EMAIL_COLORS.magenta};text-decoration:underline;">${label}</a>`;
  const dot = `<span style="color:${EMAIL_COLORS.line};"> · </span>`;

  return `<tr><td style="padding:28px 40px 32px;">
    <hr style="border:0;border-top:1px solid ${EMAIL_COLORS.line};margin:0 0 18px;">
    <div style="font-size:16px;font-weight:800;letter-spacing:-.4px;color:${EMAIL_COLORS.ink};margin:0 0 10px;">Panameer</div>
    <p style="font-size:12px;line-height:1.9;color:${EMAIL_COLORS.muted};margin:0 0 10px;">
      ${/* ⚠ LABEL ONLY (`P2-J1.1-E016`). The href stays `PANAMEER_URL`
            (https://panameer.com); `lib/host.ts` allowlists BOTH forms, so
            display and destination may differ safely. ⚠ The plain-text footer
            below is UNCHANGED — a bare URL is correct for text/plain. */""}
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
