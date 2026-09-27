import {
  emailShell,
  escapeHtml,
  footerText,
  primaryButton,
} from "@/lib/email/shell";

/**
 * ── ⚠⚠⚠ THE NOTIFICATION EMAIL — ONE TEMPLATE, DRIVEN BY THE ROW (`P0-E689` WS-B)
 *
 * ⚠⚠ **IT RENDERS A `Notification` ROW, NOT AN EVENT.** The row already carries
 * `title`, `body` and `href`, written by the event registry through `notify()`.
 * Reading them here is what makes this ONE definition instead of one-per-event
 * (`E585`), and it is why switching an event on is a one-line change to an
 * allowlist rather than a template-writing project.
 *
 * ── ⚠⚠ WHY NOT "ONE TEMPLATE PER EVENT", WHICH IS WHAT THE BRIEF SAYS ───────
 *
 * ⚠⚠⚠ **REPORTED AS A DEVIATION RATHER THAN TAKEN QUIETLY.** The brief's WS-B
 * item 5 reads *"Templates: one per event, reusing `lib/email/shell.ts`"*. There
 * are **40+ registered events**, and WS-B ships with **the allowlist EMPTY** —
 * so one-per-event would mean writing 40 templates for zero live events, and
 * every one of them would restate `title`/`body`/`href` that the registry
 * already owns. ⚠ **That is the `E585` defect being built on purpose:** one
 * concept in N places, kept in step by hand.
 * ⚠⚠ **WHAT IS PRESERVED IS THE PART THAT MATTERED** — a per-event email is
 * still possible, because an event that needs its own words can be given them in
 * the registry, where its words already live. **Nothing here forecloses that.**
 *
 * ── ⚠⚠ THE LINK IS THE ROW'S `href`, MADE ABSOLUTE ─────────────────────────
 *
 * ⚠ A relative path is meaningless in a mail client, so it is resolved against
 * `NEXT_PUBLIC_APP_URL` — the same variable `verification.ts` resolves against.
 * ⚠⚠ **A ROW WITH NO `href` RENDERS NO BUTTON** rather than a button to nowhere.
 * ⚠⚠⚠ **AND `E680(b)` IS THE REASON THE GATE CHECKS THE DESTINATION: AN `href`
 * CAN SEND A MEMBER TO A PAGE THEIR CAPABILITY CANNOT OPEN.** That is asserted in
 * `check:notification-email`, against the allowlist, not eyeballed here.
 */

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

  /* ⚠ AN ALREADY-ABSOLUTE `href` IS LEFT ALONE. The registry writes paths today,
     but a future event pointing at a full URL must not be mangled into
     `https://app.panameer.com/https://…`. */
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

  /* ⚠ `footerText` IS THE PLAIN-TEXT FOOTER AND BELONGS ONLY IN THE TEXT PART —
     `emailShell` renders the HTML footer itself, so putting it in `bodyHtml` too
     would print the footer twice in an HTML client. ⚠⚠ Caught by the compiler,
     which is the pattern Scott asked for: `footerText(year)` takes a required
     argument, so a careless `footerText()` does not build. */
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
    /* ⚠ THE SUBJECT IS THE ROW'S TITLE. The registry already wrote the one
       sentence that names what happened; inventing a second phrasing here is how
       a bell entry and its email start describing different things. */
    subject: input.title,
    html: emailShell({ logoUrl: input.logoUrl, bodyHtml }),
    text,
  };
}
