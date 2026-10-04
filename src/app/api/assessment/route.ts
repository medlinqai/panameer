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

const Body = z.object({
  companyName: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(320),
  industry: z.string().trim().max(120).optional().default(""),
  industrySpecializationId: z.string().uuid().optional().or(z.literal("")),
  /* Required (WS-4): the funding rate is resolved per-geography. */
  state: z.string().trim().min(2).max(2),
  entityType: z.string().trim().min(1).max(40),
  revenueBand: z.string().trim().min(1).max(40),
  ebitdaBand: z.string().trim().min(1).max(40),
  platform: z.string().trim().min(1).max(40),
  process: z.enum(["P2P", "O2C", "R2R", "H2R"]),
  answers: z.object({
    maturity: z.record(z.string(), z.number().nullable()),
    spendBand: z.string().max(40).optional().default(""),
    costLeverBand: z.string().max(40).optional().default(""),
    headcountBand: z.string().max(40).optional().default(""),
    aiMode: z.string().max(40).optional().default(""),
    domainFields: z
      .record(
        z.string().max(60),
        z.record(z.string().max(60), z.union([z.number().finite(), z.boolean()]))
      )
      .optional(),
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

  const companyId = owner ? await resolveAssessmentCompanyId(owner.id) : null;

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
    await writeDomainResults(tx, created.id, scored, {
      domainFields: b.answers.domainFields,
    });
    return created;
  });

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
        logoUrl: `${appBaseUrl()}/brand/panameer-lockup-ink.png`,
      });
      await sendEmail({
        to: email,
        subject: tpl.subject,
        html: tpl.html,
        text: tpl.text,
        template: "assessment-ready",
        subjectType: "Assessment",
        subjectId: a.id,
      });
      emailSent = true;
    } catch (e) {
      /* A REAL FAILURE: the key is present and the provider refused. */
      console.error(`[assessment] report email FAILED to send for assessment ${a.id}`, e);
    }
  }

  return NextResponse.json({ ok: true, shareToken: a.share_token, emailSent });
}
