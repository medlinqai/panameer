/**
 * The email suite's guard rails (brief_transactional_email_suite).
 * `npm run check:email`.
 *
 * WHY THIS EXISTS RATHER THAN A VISUAL CHECK. Almost every acceptance criterion
 * on this brief is a property of a string: the vocabulary is locked, there is
 * one magenta primary per email, the charset is declared, names are
 * capitalised, the footer carries unsubscribe and privacy. None of that is
 * visible by looking at one rendered email in one client, and all of it breaks
 * silently on the next copy edit.
 *
 * The vocabulary test is the one that earns its keep. "job" and "project" are
 * ordinary English words that will feel natural to whoever writes the next
 * template, and by then nobody will remember the rule.
 */
import { workRequestPostedTemplate } from "@/lib/email/templates/work-request-posted";
import { workRequestInviteTemplate } from "@/lib/email/templates/work-request-invite";
import { workRequestRemovedTemplate } from "@/lib/email/templates/work-request-removed";
import { workRequestDraftReminderTemplate } from "@/lib/email/templates/work-request-draft-reminder";
import { paymentMethodAddedTemplate } from "@/lib/email/templates/payment-method-added";
import { identityVerifiedTemplate } from "@/lib/email/templates/identity-verified";
import { identityVerificationRequestTemplate } from "@/lib/email/templates/identity-verification-request";
import { verifyEmailTemplate } from "@/lib/email/templates/verify-email";
import { inviteProviderTemplate } from "@/lib/email/templates/invite-provider";
import { EMAIL_COLORS } from "@/lib/email/shell";

let passed = 0;
const failures: string[] = [];
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) passed++;
  else failures.push(`${label}${detail ? `\n     ${detail}` : ""}`);
};

type Rendered = { subject: string; html: string; text: string };

/* ---- the suite under test ------------------------------------------------ */
const SUITE: { name: string; out: Rendered; inSuite: boolean }[] = [
  {
    name: "work-request-posted",
    inSuite: true,
    out: workRequestPostedTemplate({
      firstName: "scott",
      workRequestTitle: "Oracle Payables cutover support",
      requesterCompany: "ABC Consulting",
      viewUrl: "https://panameer.com/work-requests/abc",
    }),
  },
  {
    name: "work-request-invite",
    inSuite: true,
    out: workRequestInviteTemplate({
      inviteeFirstName: "dana",
      requesterCompany: "ABC Consulting",
      workRequestTitle: "Oracle Payables cutover support",
      budgetLabel: "Hourly · $120–$160 / hr",
      description: "We need help through a <cutover> weekend.",
      skills: ["Payables", "General Ledger"],
      proposeUrl: "https://panameer.com/propose/abc",
      declineUrl: "https://panameer.com/decline/abc",
    }),
  },
  {
    name: "work-request-removed",
    inSuite: true,
    out: workRequestRemovedTemplate({
      firstName: "scott",
      workRequestTitle: "asdf",
      reasons: ["No description of the work", "No skills selected"],
    }),
  },
  {
    name: "work-request-draft-reminder",
    inSuite: true,
    out: workRequestDraftReminderTemplate({
      firstName: "scott",
      workRequestTitle: "Oracle Payables cutover support",
      resumeUrl: "https://panameer.com/create-work",
    }),
  },
  {
    name: "payment-method-added",
    inSuite: true,
    out: paymentMethodAddedTemplate({
      firstName: "scott",
      cardBrand: "Visa",
      last4: "4242",
      financialAccountName: "ABC Consulting Operating",
      supportUrl: "https://panameer.com/support/bug",
    }),
  },
  {
    name: "identity-verified",
    inSuite: true,
    out: identityVerifiedTemplate({ firstName: "scott" }),
  },
  {
    name: "identity-verification-request",
    inSuite: true,
    out: identityVerificationRequestTemplate({
      firstName: "scott",
      startUrl: "https://panameer.com/settings/identity",
      learnMoreUrl: "https://panameer.com/legal/accessibility-statement",
    }),
  },
  // Refactored onto the shell by WS-A — same shell rules apply.
  {
    name: "verify-email",
    inSuite: false,
    out: verifyEmailTemplate({ firstName: "scott", verifyUrl: "https://panameer.com/v/x" }),
  },
  {
    name: "invite-provider",
    inSuite: false,
    out: inviteProviderTemplate({
      coordinatorName: "Dana Reed",
      inviteeFirstName: "scott",
      acceptUrl: "https://panameer.com/invite/x",
    }),
  },
];

/* ---- every template, every rule ------------------------------------------ */
for (const { name, out, inSuite } of SUITE) {
  ok(`${name}: has a subject`, out.subject.trim().length > 0);
  ok(`${name}: has html`, out.html.includes("<html>"));
  ok(`${name}: has a text part`, out.text.trim().length > 0);
  ok(`${name}: declares utf-8`, out.html.includes('<meta charset="utf-8">'));

  /*
    ONE MAGENTA PRIMARY (E217). Counted on the button's background fill, not on
    any appearance of the colour — links use magentaDark and the count must not
    trip over them.
  */
  const primaries = (out.html.match(new RegExp(`background:${EMAIL_COLORS.magenta};`, "g")) ?? [])
    .length;
  ok(`${name}: at most one magenta primary`, primaries <= 1, `found ${primaries}`);

  /* THE LOCKED VOCABULARY. Whole words, case-insensitive, subject + body. */
  const prose = `${out.subject} ${out.html} ${out.text}`;
  for (const banned of ["upwork", "freelancer", "uma"]) {
    ok(
      `${name}: no "${banned}"`,
      !new RegExp(`\\b${banned}\\b`, "i").test(prose),
      prose.match(new RegExp(`.{0,40}\\b${banned}\\b.{0,40}`, "i"))?.[0]
    );
  }
  /*
    "job" and "project" are checked on the VISIBLE copy only. The html carries
    URLs and attribute names that legitimately contain neither, but a future
    link like /jobs would trip a naive scan of the markup — the text part is
    what a person actually reads.
  */
  for (const banned of ["job", "jobs", "project", "projects"]) {
    ok(
      `${name}: no "${banned}" in visible copy`,
      !new RegExp(`\\b${banned}\\b`, "i").test(`${out.subject} ${out.text}`),
      `${out.subject} ${out.text}`.match(new RegExp(`.{0,40}\\b${banned}\\b.{0,40}`, "i"))?.[0]
    );
  }

  if (inSuite) {
    /* The shared footer, on every email in the suite. */
    ok(`${name}: footer has panameer.com`, out.html.includes("panameer.com"));
    ok(`${name}: footer has Instagram`, out.html.includes("instagram.com/onpanameer"));
    ok(`${name}: footer has YouTube`, out.html.includes("youtube.com/c/panameer"));
    ok(`${name}: footer has LinkedIn`, out.html.includes("linkedin.com/company/panameer"));
    ok(`${name}: footer has Unsubscribe`, out.html.includes("Unsubscribe"));
    ok(`${name}: footer has Privacy`, out.html.includes("Privacy"));
    ok(`${name}: footer has Contact Support`, out.html.includes("Contact Support"));
    ok(`${name}: footer has the copyright`, /© Panameer Inc \d{4}/.test(out.html));
    ok(`${name}: text part carries the footer too`, out.text.includes("© Panameer Inc"));
  }
}

/* ---- name capitalisation (brief_P / E006) -------------------------------- */
for (const { name, out } of SUITE) {
  ok(`${name}: capitalises the name`, !/\bHi scott\b/.test(out.text), "found lowercase 'Hi scott'");
}

/* ---- the copy deck, verbatim where it is specific ------------------------ */
const posted = SUITE[0].out;
ok(
  "posted: subject matches the deck",
  posted.subject === "Work Request Posted: Oracle Payables cutover support",
  posted.subject
);
ok("posted: says the request is live", posted.text.includes("is live for ABC Consulting"));
ok("posted: CTA is View Work Request", posted.html.includes("View Work Request"));

const invite = SUITE[1].out;
ok(
  "invite: subject matches the deck",
  invite.subject === "You're invited to propose — Oracle Payables cutover support",
  invite.subject
);
ok("invite: carries the lede", invite.text.includes("Companies come to Panameer"));
ok("invite: has both CTAs", invite.html.includes("Submit a Proposal") && invite.html.includes("Decline"));
ok("invite: lists the skills", invite.html.includes("Payables") && invite.html.includes("General Ledger"));
/* HTML in requester-supplied copy must not reach the client as markup. */
ok(
  "invite: escapes the description",
  invite.html.includes("&lt;cutover&gt;") && !invite.html.includes("<cutover>"),
  "unescaped angle brackets in a requester-authored description"
);

const removed = SUITE[2].out;
ok("removed: subject matches the deck", removed.subject === "Your Work Request was removed", removed.subject);
ok("removed: signs off as Trust & Safety", removed.text.includes("Panameer Trust & Safety"));
ok("removed: has no CTA button", !removed.html.includes(`background:${EMAIL_COLORS.magenta};`));

const draft = SUITE[3].out;
ok(
  "draft: subject matches the deck",
  draft.subject === "Almost there — finish your Work Request, Scott",
  draft.subject
);
ok("draft: CTA is Finish & Post", draft.html.includes("Finish &amp; Post"));

const payment = SUITE[4].out;
ok(
  "payment: subject matches the deck",
  payment.subject === "Visa was added to ABC Consulting Operating",
  payment.subject
);
ok("payment: names the last four", payment.text.includes("ending in 4242"));

const verified = SUITE[5].out;
ok("verified: subject matches the deck", verified.subject === "You're verified 🎉", verified.subject);

const request = SUITE[6].out;
ok(
  "request: subject matches the deck",
  request.subject === "Verify your identity to keep working on Panameer",
  request.subject
);
ok("request: CTA is Get Started", request.html.includes("Get Started"));
ok("request: states the seven-day window", request.text.includes("seven days"));

if (failures.length) {
  console.error(`\n${failures.length} failed:\n`);
  for (const f of failures) console.error(`  ✗ ${f}\n`);
}
console.log(`${passed} passed, ${failures.length} failed`);
process.exit(failures.length ? 1 : 0);
