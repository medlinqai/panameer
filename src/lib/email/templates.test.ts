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
import { passwordResetTemplate } from "@/lib/email/templates/password-reset";
/* ⚠⚠ `P2-J3-E523` — THE INVITATION WAS NOT IN THIS SUITE AT ALL. Its copy was
   rewritten with nothing asserting it; `check:email` passed either way. */
import { colleagueInviteTemplate } from "@/lib/email/templates/colleague-invite";
/* ⚠ `P2-J3-E523` — two of the four unasserted templates added; the other two
   FAIL and are reported, not fixed. See the block beside them below. */
import { assessmentReadyTemplate } from "@/lib/email/templates/assessment-ready";
import { projectValidatedTemplate } from "@/lib/email/templates/project-validated";
import { projectValidationTemplate } from "@/lib/email/templates/project-validation";
import { recommendationRequestTemplate } from "@/lib/email/templates/recommendation-request";
import { finishLaterTemplate } from "@/lib/email/templates/finish-later";
import { inviteProviderTemplate } from "@/lib/email/templates/invite-provider";
import { EMAIL_COLORS } from "@/lib/email/shell";
/* ⚠ `P1-ALL-E371` WS-A2 — asserting the capture transport's default. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { mailCaptureEnabled } from "@/lib/resend";

let passed = 0;
const failures: string[] = [];

/*
  ── ⚠⚠ KNOWN-OPEN: AN ASSERTION THAT RUNS, REPORTS, AND DOES NOT FAIL ───────

  ⚠ SCOTT, 2026-09-17, on `project-validation`: *"LEAVE IT RED AND RECORD IT…
  It stays in the suite, failing, as the standing evidence that the question
  needs answering. ⚠ If a red gate is intolerable, mark it skipped WITH the
  reason and the open question named — never delete the assertion."*

  ⚠⚠ A PERMANENTLY-RED MERGE GATE IS INTOLERABLE HERE, AND THE REPO HAS THE
  SCAR: CLAUDE.md records `check:company-binding` RED ON `main` from 2026-08-30,
  and the cost was not the red — it was that every later run had to remember
  which failure was "the expected one". A gate nobody can read at a glance stops
  being a gate.

  ⚠ SO THE ASSERTION STILL RUNS AND ITS RESULT IS STILL PRINTED — LOUDLY, with
  the open question named and an id attached. What changes is only that a KNOWN
  open question does not turn the exit code red. ⚠⚠ IT IS NOT DELETED, NOT
  COMMENTED OUT, AND NOT NARROWED. If somebody fixes the underlying question,
  this entry goes green and the list is what tells them to remove it.
*/
/*
  ⚠⚠ `opened` IS NOT DECORATION (Scott, 2026-09-17): *"The stale check catches
  accidental fixes; it does not catch an entry sitting there for six months. A
  visible age is what stops this becoming a parking lot."*
  ⚠ The age is printed with every entry, on every run.
*/
const KNOWN_OPEN: { label: string; id: string; opened: string; why: string }[] = [
  {
    label: 'project-validation: no "project" in visible copy',
    id: "P2-J3-E523",
    opened: "2026-09-17",
    why:
      "THE VOCABULARY RULE MEETS THE APP'S OWN NOUN. `Project` is a live model " +
      "that renders on the profile, so the APP says a word the EMAILS ban. " +
      "Scott parked the general question deliberately; rewriting this copy " +
      "would decide it by the back door.",
  },
  {
    label: "recommendation-request: declares utf-8",
    id: "E555",
    opened: "2026-09-17",
    why:
      "NOT COPY — the template emits NO <meta charset=\"utf-8\"> at all. It " +
      "hand-builds its html instead of using emailShell(). Accented names and " +
      "em-dashes mojibake. Allocated its own id; not fixed inside a coverage change.",
  },
];
const opened: string[] = [];

const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) {
    passed++;
    return;
  }
  const known = KNOWN_OPEN.find((k) => k.label === label);
  if (known) {
    const days = Math.floor((Date.now() - Date.parse(known.opened)) / 86_400_000);
    const age = days <= 0 ? "opened today" : `OPEN ${days} day${days === 1 ? "" : "s"}`;
    opened.push(
      `${known.id} — ${label}\n     ⚠ ${age} (since ${known.opened})\n     ${known.why}` +
        (detail ? `\n     seen: ${detail}` : "")
    );
    return;
  }
  failures.push(`${label}${detail ? `\n     ${detail}` : ""}`);
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
  /* ⚠ `P1-ALL-E528` Part B — the reset mail is transactional and carries NO
     category, so the suppression footer offers unsubscribe-from-everything.
     ⚠⚠ `inSuite: false` for the same reason `verify-email` is: it is sent to an
     address that has not opted into anything. */
  {
    name: "password-reset",
    inSuite: false,
    out: passwordResetTemplate({ firstName: "scott", resetUrl: "https://panameer.com/reset-password?token=x" }),
  },
  /* ⚠⚠ `P2-J3-E523` — THE INVITATION WAS NOT IN THIS SUITE AT ALL. Its copy was
     rewritten end to end with NOTHING asserting it; `check:email` passed either
     way, and the vocabulary rule that bans "project" never saw the sentence that
     broke it. ⚠ That is how the word reached an APPROVED draft.
     ⚠ `inSuite: false` — an invitation goes to somebody who has opted into
     nothing, like `verify-email` below it. */
  {
    name: "colleague-invite",
    inSuite: false,
    out: colleagueInviteTemplate({
      inviterName: "phil",
      inviteeName: "dana",
      joinUrl: "https://panameer.com/invite/colleague/abc",
      message: "Thought of you for this.",
    }),
  },
  /*
    ── ⚠⚠ THE FOUR TEMPLATES NOTHING ASSERTED (`P2-J3-E523`) ──────────────────

    ⚠ 16 templates on disk, 12 in this suite. The missing four were
    `assessment-ready`, `project-validated`, `project-validation` and
    `recommendation-request`. ⚠⚠ TWO ARE ADDED HERE. THE OTHER TWO GO RED AND
    ARE REPORTED, NOT FIXED — Scott, 2026-09-17: *"if it surfaces more copy
    collisions, STOP and list them rather than fixing copy on your own."*

    ⚠ `project-validation` — FAILS `no "project" in visible copy`. ⚠⚠ ITS COPY
    IS ABOUT THE `Project` MODEL, so this is the vocabulary rule meeting the
    app's own noun head-on. ⚠ It is the SAME open question Scott parked when he
    ruled this brief's sentence: the APP says a word the EMAILS ban. ⚠⚠ DO NOT
    REWRITE THE COPY TO GET THE GATE GREEN — that decides the open question by
    the back door.
    ⚠ `project-validated` PASSES because its only "project" is the interpolated
    `projectName` VALUE, not the literal word in the copy.

    ⚠ `recommendation-request` — FAILS `declares utf-8`, and that is NOT a copy
    problem: ⚠⚠ THE TEMPLATE EMITS NO `<meta charset="utf-8">` AT ALL. It builds
    its own table rather than using `emailShell()`, and unlike the other
    hand-built ones it omits the charset. ⚠ A REAL DEFECT (accented names and
    typographic dashes can mojibake), reported for its own id — not fixed inside
    a gate-coverage change.
  */
  { name: "assessment-ready", inSuite: false,
    out: assessmentReadyTemplate({ companyName: "Acme", processName: "Procure-to-Pay", reportUrl: "https://panameer.com/r/x" }) },
  { name: "project-validated", inSuite: false,
    out: projectValidatedTemplate({ firstName: "scott", projectName: "Cloud Rollout", clientName: "Acme", profileUrl: "https://panameer.com/p/x" }) },
  /* ⚠⚠ THESE TWO ARE IN THE SUITE AND THEY FAIL. That is deliberate — see
     KNOWN_OPEN at the top. ⚠ ALL 16 TEMPLATES ARE NOW ASSERTED; the coverage
     hole that let the invitation's copy drift is closed. */
  { name: "project-validation", inSuite: false,
    out: projectValidationTemplate({ providerName: "scott", projectName: "Cloud Rollout", clientName: "Acme", confirmUrl: "https://panameer.com/c/x" }) },
  { name: "recommendation-request", inSuite: false,
    out: recommendationRequestTemplate({ providerName: "scott", contactName: "dana", message: "Would you vouch?", respondUrl: "https://panameer.com/r/x", invite: false }) },
  // Refactored onto the shell by WS-A — same shell rules apply.
  {
    name: "verify-email",
    inSuite: false,
    out: verifyEmailTemplate({ firstName: "scott", verifyUrl: "https://panameer.com/v/x" }),
  },
  /*
    ⚠⚠ BOTH VARIANTS ARE IN THE SUITE, AND THAT IS THE POINT (`P2-J1.1-E034`).
    `E015` existed because the buyer subject was fixed and the provider one was
    not. Only the buyer half of THIS email is wired today — `Finish later` exists
    only on the requester wizard — so the provider variant would be the exact
    half that rots unnoticed. Asserting both is what stops that.
  */
  {
    name: "finish-later (buyer)",
    inSuite: false,
    out: finishLaterTemplate({
      firstName: "layne",
      resumeUrl: "https://panameer.com/join/requester/steps",
      audience: "buyer",
    }),
  },
  {
    name: "finish-later (provider)",
    inSuite: false,
    out: finishLaterTemplate({
      firstName: "layne",
      resumeUrl: "https://panameer.com/join/requester/steps",
      audience: "seller",
    }),
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

/* ---- `P2-J1.1-E034` — the two Finish Later subjects are DIFFERENT and TITLE CASE --
   ⚠ The failure this guards is `E015`'s: one variant corrected, the other left
   behind. Asserting they DIFFER is what catches a copy-paste that ships the same
   subject twice, which no per-variant assertion would notice. */
{
  const buyerOut = finishLaterTemplate({
    firstName: "layne",
    resumeUrl: "https://panameer.com/join/requester/steps",
    audience: "buyer",
  });
  const sellerOut = finishLaterTemplate({
    firstName: "layne",
    resumeUrl: "https://panameer.com/join/requester/steps",
    audience: "seller",
  });
  ok(
    "finish-later: the buyer subject is Scott's pattern, Title Case",
    buyerOut.subject === "New Service Buyer — Continue Your Registration on Panameer"
  );
  ok(
    "finish-later: the provider subject is Scott's words, verbatim",
    sellerOut.subject === "New Service Provider — Continue Your Registration on Panameer"
  );
  ok("finish-later: the two subjects differ", buyerOut.subject !== sellerOut.subject);
  ok(
    "finish-later: the heading is Scott's copy, with the name",
    buyerOut.html.includes("Continue your registration, Layne") &&
      buyerOut.text.includes("Continue your registration, Layne")
  );
  ok(
    "finish-later: the button is Scott's label",
    buyerOut.html.includes("Continue My Registration")
  );
  ok(
    "finish-later: the body carries Scott's phrase",
    buyerOut.html.includes("continue the registration you started") &&
      buyerOut.text.includes("continue the registration you started")
  );
  /* ⚠⚠ IT MUST LAND ON THE WIZARD, NOT `/dashboard` — a link to the dashboard
     would make this email a worse version of the button that sent it. */
  ok(
    "finish-later: the button lands on the wizard, never /dashboard",
    buyerOut.html.includes("/join/requester/steps") &&
      !buyerOut.html.includes('href="https://panameer.com/dashboard"')
  );
}

/* ---- `P2-J1.1-E015`/`E018` — the verification pair --------------------------- */
{
  /* ── ⚠⚠ `P1-ALL-E528` Part B — the reset mail's three load-bearing lines ── */
  {
    const r = passwordResetTemplate({ firstName: "scott", resetUrl: "https://x/r?token=abc" });
    ok("password-reset: subject is Title Case", r.subject === "Reset Your Panameer Password");
    ok("password-reset: the link is in both halves", r.html.includes("https://x/r?token=abc") && r.text.includes("https://x/r?token=abc"));
    /* ⚠ THE EXPIRY IS A FACT IN TWO PLACES — the constant and this sentence. */
    ok("password-reset: says it expires in 1 hour, in both halves", r.html.includes("expires in 1 hour") && r.text.includes("expires in 1 hour"));
    ok("password-reset: says it is single use", r.html.includes("used once") && r.text.includes("used once"));
    /* ⚠⚠ THE LINE THAT STOPS A ROUTINE EMAIL READING LIKE A BREAK-IN. */
    ok(
      "password-reset: tells an unexpecting reader nothing has changed",
      r.html.includes("your password has not changed") && r.text.includes("your password has not changed")
    );
    ok("password-reset: never contains the word password twice in the subject", (r.subject.match(/password/gi) ?? []).length === 1);
  }

  const b = verifyEmailTemplate({ firstName: "scott", verifyUrl: "https://x/v", audience: "buyer" });
  const s2 = verifyEmailTemplate({ firstName: "scott", verifyUrl: "https://x/v", audience: "seller" });
  ok("verify-email: buyer subject is Title Case", b.subject === "New Service Buyer — Verify Your Email to Continue on Panameer");
  ok("verify-email: provider subject is Title Case", s2.subject === "New Service Provider — Verify Your Email to Continue on Panameer");
  /* ⚠⚠ E018 LIVED IN TWO PLACES — the HTML clause and a separately-worded plain
     text line. Asserting only the HTML is how text/plain keeps a dropped promise. */
  ok(
    "verify-email: the buyer HTML no longer promises the finish line",
    b.html.includes("complete your registration") && !b.html.includes("start finding the talent you need")
  );
  ok(
    "verify-email: and neither does the plain text",
    b.text.includes("complete your registration") && !b.text.includes("start finding the talent you need")
  );
  ok("verify-email: the provider clause is unchanged", s2.html.includes("start building your provider profile"));
  ok("verify-email: the heading is unchanged", b.html.includes("Confirm your email"));
}

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

// ---------------------------------------------------------------------------
// ⚠⚠ THE CAPTURE TRANSPORT MUST NEVER BE THE DEFAULT (`P1-ALL-E371` WS-A2).
//
// A capture mode that switched itself on is the worst failure this code can
// have: every transactional email silently stops reaching anyone while the
// caller is told it succeeded. Verification, invites, recommendations — all
// dead, all reporting success. So the default is asserted, not trusted.
// ---------------------------------------------------------------------------

const resendSrc = readFileSync(join("src", "lib", "resend.ts"), "utf8");

ok(
  "WS-A2 — the capture transport exists",
  /export function mailCaptureEnabled/.test(resendSrc)
);
/* ⚠ EXACTLY `"1"`, NOT TRUTHINESS. `MAIL_CAPTURE=0` and `MAIL_CAPTURE=false`
   must both mean SEND — and `Boolean("0")` is `true`, which would turn either
   of those into silent capture. */
ok(
  "WS-A2 — capture requires MAIL_CAPTURE === \"1\" exactly",
  /process\.env\.MAIL_CAPTURE\?\.trim\(\) === "1"/.test(resendSrc),
  "truthiness would make MAIL_CAPTURE=0 mean capture"
);
/* ⚠ AND THE LIVE PROCESS PROVES IT, not just the source: this harness runs with
   no MAIL_CAPTURE set, so the real function must say "send". */
ok(
  "WS-A2 — with no MAIL_CAPTURE set, the live build takes the SENDING path",
  mailCaptureEnabled() === false,
  `MAIL_CAPTURE=${JSON.stringify(process.env.MAIL_CAPTURE ?? null)} -> capture=${mailCaptureEnabled()}`
);
/* ⚠ THE CAPTURE BRANCH IS THE ONLY EARLY RETURN and sits BEFORE `getResend()`,
   which throws without a key. Reordering them would make capture unusable on a
   machine with no key — which is exactly the machine that needs it. */
ok(
  "WS-A2 — the capture branch precedes the Resend client construction",
  resendSrc.indexOf("if (mailCaptureEnabled())") < resendSrc.indexOf("await getResend()"),
  "getResend() throws without a key, so capture must be reached first"
);
/* ⚠ CAPTURED MAIL IS GITIGNORED. Nothing captured may enter the repo — a
   captured file holds a real recipient address and a rendered body. */
ok(
  "WS-A2 — the capture directory is gitignored",
  readFileSync(".gitignore", "utf8").includes(".mail-capture"),
  "a captured file holds a real address and a rendered body"
);
/* ⚠ AND THE SAFETY NET FOR WS-A: the default sender is Resend's test domain,
   which only delivers to the account's own address. ⚠⚠ WHEN THIS DEFAULT
   CHANGES TO A VERIFIED PANAMEER DOMAIN, MAIL GOES WHEREVER THE CODE SAYS —
   this assertion is the tripwire for that moment. */
ok(
  "WS-A — EMAIL_FROM still defaults to the Resend test domain",
  /onboarding@resend\.dev/.test(resendSrc),
  "on a verified domain a stray send reaches a real member; capture stops being a convenience"
);

if (failures.length) {
  console.error(`\n${failures.length} failed:\n`);
  for (const f of failures) console.error(`  ✗ ${f}\n`);
}

/*
  ⚠⚠ PRINTED LOUDLY, AND ALWAYS — including on a green run. The whole risk of a
  known-open entry is that it goes quiet and becomes permanent; a line nobody
  sees is the same as a deleted assertion.
*/
if (opened.length) {
  console.log(`\n⚠⚠ ${opened.length} KNOWN OPEN — asserted, failing, NOT counted as a failure:\n`);
  for (const o of opened) console.log(`  ⚠ ${o}\n`);
  console.log(`  ⚠ These are open QUESTIONS, not passing tests. Each needs a ruling.\n`);
}

/* ⚠ An entry that has been FIXED must be removed from KNOWN_OPEN — otherwise
   the list rots into a place where real failures can hide. */
const stale = KNOWN_OPEN.filter((k) => !opened.some((o) => o.includes(k.label)));
if (stale.length) {
  console.error(`\n${stale.length} STALE known-open entries — they now PASS; delete them:\n`);
  for (const k of stale) console.error(`  ✗ ${k.id} — ${k.label}\n`);
}

const hard = failures.length + stale.length;
console.log(`${passed} passed, ${failures.length} failed, ${opened.length} known open`);
process.exit(hard ? 1 : 0);
