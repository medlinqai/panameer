import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/normalizeEmail";
import { appBaseUrl } from "@/lib/verification";
import { mailConfigured, sendEmail } from "@/lib/resend";
import { getSessionViewer } from "@/lib/session";
import { scoreAssessment } from "@/lib/assessment/scoring";
import {
  resolveAssessmentCompanyId,
  writeDomainResults,
} from "@/lib/assessment/domain-results";
import { assessmentReadyTemplate } from "@/lib/email/templates/assessment-ready";

/**
 * SUBMIT THE ASSESSMENT (WS-B).
 *
 * ── PUBLIC ON PURPOSE, AND THEREFORE VALIDATED HARD ──────────────────────────
 *
 * This is the one write in the app an anonymous visitor can make, because the
 * whole funnel depends on not asking for an account first. Everything is
 * therefore Zod-checked and nothing from the client is trusted as a
 * pass-through: the score is computed HERE, from the answers, never accepted
 * from the browser. A client that could post its own `score_pct` could post
 * itself a report.
 *
 * ── THE SCORE IS FROZEN AT SUBMIT — AND SO IS EVERY DOMAIN, NOW ──────────────
 *
 * `score_pct` is stored rather than derived on every render. The scoring
 * weights will be tuned — they are judgement calls in a named table — and a
 * report someone was emailed in August should not quietly say something
 * different in October because a weight moved.
 *
 * ⚠ THAT USED TO COVER EXACTLY ONE NUMBER (brief_assessment_instance_model).
 * Every per-domain rung, dollar range and rank on the report was recomputed on
 * every read, so moving a weight in `DOLLAR_WEIGHTS` silently rewrote every
 * historical report — the precise failure the paragraph above was written to
 * prevent, applied to one field out of a dozen. The submission and its ten
 * `AssessmentDomainResult` rows are now written in ONE TRANSACTION, from the
 * SAME `Scored` object, and the report reads those rows.
 *
 * ── THE EMAIL FAILING MUST NOT LOSE THE LEAD ─────────────────────────────────
 *
 * The assessment row is committed BEFORE the send, and a send failure is logged
 * and swallowed rather than returned as an error. With no RESEND_API_KEY in
 * dev the send is a no-op, and a 500 there would make the whole flow
 * untestable locally — but more importantly, in production the answers are the
 * asset. A resend can always be triggered later; a discarded submission cannot.
 *
 * ⚠ SWALLOWED IS NOT THE SAME AS SILENT (E031). The catch stays, but the
 * response now carries `emailSent` so the CLIENT knows what actually happened
 * instead of assuming, and the two failure modes log differently — see
 * `mailConfigured()` below. Before this, a missing key produced a visitor told
 * "check your email in a minute" and a report nobody could reach.
 *
 * ── PUBLIC IS NOT THE SAME AS ANONYMOUS ──────────────────────────────────────
 *
 * A signed-in buyer can take the assessment, and used to be treated as a
 * stranger: asked for an email the app already knew and then mailed a magic
 * link to sign in as themselves. When there IS a session, the assessment is
 * stamped with `user_id` and the SESSION'S email is what gets stored — see
 * "THE OWNER IS RESOLVED FROM THE SESSION" in POST.
 */

/**
 * ⚠ THIS MUST AGREE WITH `REQUIRED_BASICS` IN AssessmentWizard.tsx.
 *
 * The client gate and this schema are two statements of the same rule, and a
 * client that gates on more than the server enforces is a client one fetch call
 * can bypass. Required here = `.min(1)`; optional = `.optional().default("")`.
 * `check:assessment` asserts the two lists match, so they cannot drift apart
 * silently.
 *
 * Required: companyName · email · state · entityType · revenueBand ·
 *           ebitdaBand · platform
 * Optional: industry
 */
const Body = z.object({
  companyName: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(320),
  /*
    THE ONLY OPTIONAL FIELD ON STEP 0 — and it is now TWO fields, both optional.

    `industrySpecializationId` is what the dropdown sends. `industry` is kept in
    the schema because rows captured before 2026-08-14 hold free text with no id
    to map to; it is still ACCEPTED here so an older client (a stale tab mid-form
    when this deployed) does not get a 400 on submit.
  */
  industry: z.string().trim().max(120).optional().default(""),
  industrySpecializationId: z.string().uuid().optional().or(z.literal("")),
  /* Required (WS-4): the funding rate is resolved per-geography. */
  state: z.string().trim().min(2).max(2),
  entityType: z.string().trim().min(1).max(40),
  revenueBand: z.string().trim().min(1).max(40),
  /* Required (WS-4): funding = EBITDA x TAX_RATE. Without it the report has a
     savings figure and no funding figure — half the argument. */
  ebitdaBand: z.string().trim().min(1).max(40),
  platform: z.string().trim().min(1).max(40),
  process: z.enum(["P2P", "O2C", "R2R", "H2R"]),
  answers: z.object({
    maturity: z.record(z.string(), z.number().nullable()),
    spendBand: z.string().max(40).optional().default(""),
    costLeverBand: z.string().max(40).optional().default(""),
    headcountBand: z.string().max(40).optional().default(""),
    aiMode: z.string().max(40).optional().default(""),
    /*
      ── ⚠ THE DECK'S PER-DOMAIN EXTRA FIELDS (slides 2–11) ────────────────────

      domainKey → fieldId → the CANONICAL value: a count in whole units, dollars in
      CENTS, a percent as an integer 0–100, or a boolean. The wizard canonicalises
      through `parseFieldValue` and this schema accepts the result.

      ⚠ OPTIONAL AT THIS BOUNDARY EVEN THOUGH EVERY FIELD IS REQUIRED IN THE WIZARD,
      and that is deliberate. Absent means NOT ASKED — the 13 assessments taken
      before this brief have no such key and must keep rendering — and rejecting the
      whole submission here would throw away a completed assessment over a field
      nobody could see. The requirement is enforced where the visitor can act on it:
      `continueDisabled` on each `cd_*` step.

      ⚠ NOTHING HERE IS SCORED. `scoreAssessment` does not read this key and
      `check:assessment-volume` asserts the `Scored` object is byte-identical with
      and without it. This brief adds an input; it changes no output.

      ⚠ `.passthrough()` IS NOT USED. Unknown field ids are dropped rather than
      stored, so a stale client cannot write a key the spec no longer has.
    */
    domainFields: z
      .record(
        z.string().max(60),
        z.record(z.string().max(60), z.union([z.number().finite(), z.boolean()]))
      )
      .optional(),
    /*
      ⚠ SLIDE 15's OTHER FOUR FIELDS (E039), ALL OPTIONAL. Only `email` is required
      and it keeps its own column — these are stored inside `answers` because the
      model's Json comment says a new question should not be a migration, and because
      nothing reads them yet.

      ⚠ OPTIONAL HERE MEANS OPTIONAL IN `REQUIRED_BASICS` TOO. `check:assessment`
      asserts the client gate and this schema require exactly the same fields, so
      making any of these required on one side alone fails the build — which is the
      point. Enforcing one is a one-line change in each of two places, never one.
    */
    contact: z
      .object({
        timeZone: z.string().trim().max(60).optional().default(""),
        firstName: z.string().trim().max(80).optional().default(""),
        lastName: z.string().trim().max(80).optional().default(""),
        mobile: z.string().trim().max(40).optional().default(""),
      })
      .optional(),
  }),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Those answers didn't look right." }, { status: 400 });
  }
  const b = parsed.data;

  /*
    ── THE OWNER IS RESOLVED FROM THE SESSION, NEVER FROM THE BODY ────────────

    CLAUDE.md rule 3: "API writes are owner-scoped: the target profile/id is
    resolved from the session, never accepted from client input." So there is
    deliberately NO `userId` in the Zod schema above — the only way to attach an
    assessment to an account is to be signed in as that account when you submit.

    ⚠ AND THE SESSION'S EMAIL WINS. `b.email` is whatever the browser posted,
    and a signed-in visitor who edits the field (or replays the request) must
    not be able to file an assessment under somebody else's address — that
    address is what /assess/claim turns into an account, so accepting it would
    let a signed-in user mint a claim link for an inbox they do not control.
    The submitted value is used ONLY when there is no session.

    The user row is re-read rather than trusted from the JWT: the token can
    outlive the row it names, and `user_id` is a foreign key. No row, no stamp —
    the submission still lands as an anonymous one rather than failing.
  */
  const viewer = await getSessionViewer();
  const owner = viewer
    ? await prisma.user.findUnique({
        where: { id: viewer.userId },
        select: { id: true, email: true },
      })
    : null;

  const email = normalizeEmail(owner?.email ?? b.email);

  const scored = scoreAssessment(b.answers, {
    revenueBand: b.revenueBand,
    ebitdaBand: b.ebitdaBand || null,
    platform: b.platform,
    state: b.state || null,
  });

  /*
    ── THE COMPANY, WHEN THERE IS ONE ──────────────────────────────────────────

    ⚠ ONLY REACHABLE FOR A SIGNED-IN SUBMITTER, and that is most of the point:
    an anonymous visitor has no account and therefore no company, which is the
    top of the funnel and a first-class case. `company_id` stays null for them
    and `/assess/claim` fills it in if the claimer turns out to have a binding.

    ⚠ RESOLVED THROUGH `getCompanyBinding` (inside the helper), NEVER from
    `Person.company_id` — that column is the signup placeholder and reading it as
    a company is `P1-J1.2-E003`. `check:assessment-instance` fails the build if
    this file mentions it.
  */
  const companyId = owner ? await resolveAssessmentCompanyId(owner.id) : null;

  /*
    ── ⚠ ONE TRANSACTION: THE ASSESSMENT AND ITS DOMAIN ROWS ───────────────────

    A submission and its per-domain breakdown are one fact. If a domain row
    fails, the whole thing rolls back and the visitor retries — a stored
    assessment whose report shows three of ten domains is worse than no stored
    assessment, because nothing downstream can tell it is incomplete.

    ⚠ `writeDomainResults` IS HANDED THE `scored` OBJECT, NOT THE ANSWERS. It
    does not re-score. Scoring twice is two chances to disagree with the number
    that was just stored in `score_pct`.
  */
  const a = await prisma.$transaction(async (tx) => {
    const created = await tx.assessment.create({
      data: {
        email,
        company_name: b.companyName,
        company_id: companyId,
        industry: b.industry || null,
        industry_specialization_id: b.industrySpecializationId || null,
        state: b.state || null,
        entity_type: b.entityType || null,
        revenue_band: b.revenueBand,
        ebitda_band: b.ebitdaBand || null,
        platform: b.platform,
        process: b.process,
        answers: b.answers,
        score_pct: scored.maturityPct,
        /* Null for a logged-out visitor — /assess/claim fills it in later. */
        user_id: owner?.id ?? null,
      },
      select: { id: true, share_token: true, company_name: true },
    });
    /*
      ⚠ THE DECK FIELDS RIDE ALONG WITH THE SCORE, IN THE SAME TRANSACTION. They are
      resolved to stored rows inside `writeDomainResults` — not recomputed, not
      re-parsed — so a report can never hold a figure the submission did not carry.
    */
    await writeDomainResults(tx, created.id, scored, {
      domainFields: b.answers.domainFields,
    });
    return created;
  });

  /*
    THE MAGIC LINK IS THE SHARE TOKEN, not a second one-time credential.

    The existing EMAIL/SIGNIN token pair is built around a User, and there is no
    User yet — the whole point of this step is that they have not signed up. So
    the link carries the assessment's own `share_token`, and /assess/claim is
    what turns it into an account. The token is a uuid, single-purpose, and the
    report it opens contains no one else's data.
  */
  /*
    ⚠ A SIGNED-IN SUBMITTER GETS THE REPORT LINK, NOT A CLAIM LINK. /assess/claim
    exists to turn an inbox into an account; someone who already has one has
    nothing to claim, and sending them through it would sign them in again as
    themselves for no reason.
  */
  const url = owner
    ? `${appBaseUrl()}/assess/r/${a.share_token}`
    : `${appBaseUrl()}/assess/claim/${a.share_token}`;

  /*
    ── THE EMAIL IS A RECEIPT NOW, NOT THE DOOR ───────────────────────────────

    The client no longer waits on this to show the report — it redirects
    straight to /assess/r/<shareToken> — so everything below is best-effort. But
    `emailSent` goes back in the response, because the report renders "we've
    also emailed this link to you" and that sentence must not be printed on a
    send that did not happen.
  */
  let emailSent = false;
  if (!mailConfigured()) {
    /*
      NOT AN ERROR, AND DELIBERATELY NOT LOGGED AS ONE. RESEND_API_KEY is simply
      absent — the normal state of a dev machine. The report URL goes in the
      line so a local walk has the link the email would have carried.
    */
    console.warn(
      `[assessment] report email SKIPPED — RESEND_API_KEY is not configured (configuration, not an outage). Assessment ${a.id} saved; report link: ${url}`
    );
  } else {
    try {
      const tpl = assessmentReadyTemplate({
        companyName: a.company_name,
        processName: b.process === "P2P" ? "Procurement" : b.process,
        reportUrl: url,
        logoUrl: `${appBaseUrl()}/brand/panameer-new-on-light.png`,
      });
      await sendEmail({ to: email, subject: tpl.subject, html: tpl.html, text: tpl.text });
      emailSent = true;
    } catch (e) {
      /* A REAL FAILURE: the key is present and the provider refused. */
      console.error(`[assessment] report email FAILED to send for assessment ${a.id}`, e);
    }
  }

  return NextResponse.json({ ok: true, shareToken: a.share_token, emailSent });
}
