import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/normalizeEmail";
import { appBaseUrl } from "@/lib/verification";
import { sendEmail } from "@/lib/resend";
import { scoreAssessment } from "@/lib/assessment/scoring";
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
 * ── THE SCORE IS FROZEN AT SUBMIT ────────────────────────────────────────────
 *
 * `score_pct` is stored rather than derived on every render. The scoring
 * weights will be tuned — they are judgement calls in a named table — and a
 * report someone was emailed in August should not quietly say something
 * different in October because a weight moved.
 *
 * ── THE EMAIL FAILING MUST NOT LOSE THE LEAD ─────────────────────────────────
 *
 * The assessment row is committed BEFORE the send, and a send failure is logged
 * and swallowed rather than returned as an error. With no RESEND_API_KEY in
 * dev the send is a no-op, and a 500 there would make the whole flow
 * untestable locally — but more importantly, in production the answers are the
 * asset. A resend can always be triggered later; a discarded submission cannot.
 */

const Body = z.object({
  companyName: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(320),
  industry: z.string().trim().max(120).optional().default(""),
  state: z.string().trim().max(2).optional().default(""),
  entityType: z.string().trim().max(40).optional().default(""),
  revenueBand: z.string().trim().max(40),
  ebitdaBand: z.string().trim().max(40).optional().default(""),
  platform: z.string().trim().max(40),
  process: z.enum(["P2P", "O2C", "R2R", "H2R"]),
  answers: z.object({
    maturity: z.record(z.string(), z.number().nullable()),
    spendBand: z.string().max(40).optional().default(""),
    costLeverBand: z.string().max(40).optional().default(""),
    headcountBand: z.string().max(40).optional().default(""),
    aiMode: z.string().max(40).optional().default(""),
  }),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Those answers didn't look right." }, { status: 400 });
  }
  const b = parsed.data;
  const email = normalizeEmail(b.email);

  const scored = scoreAssessment(b.answers, {
    revenueBand: b.revenueBand,
    ebitdaBand: b.ebitdaBand || null,
    platform: b.platform,
    state: b.state || null,
  });

  const a = await prisma.assessment.create({
    data: {
      email,
      company_name: b.companyName,
      industry: b.industry || null,
      state: b.state || null,
      entity_type: b.entityType || null,
      revenue_band: b.revenueBand,
      ebitda_band: b.ebitdaBand || null,
      platform: b.platform,
      process: b.process,
      answers: b.answers,
      score_pct: scored.maturityPct,
    },
    select: { id: true, share_token: true, company_name: true },
  });

  /*
    THE MAGIC LINK IS THE SHARE TOKEN, not a second one-time credential.

    The existing EMAIL/SIGNIN token pair is built around a User, and there is no
    User yet — the whole point of this step is that they have not signed up. So
    the link carries the assessment's own `share_token`, and /assess/claim is
    what turns it into an account. The token is a uuid, single-purpose, and the
    report it opens contains no one else's data.
  */
  const url = `${appBaseUrl()}/assess/claim/${a.share_token}`;
  try {
    const tpl = assessmentReadyTemplate({
      companyName: a.company_name,
      processName: b.process === "P2P" ? "Procurement" : b.process,
      reportUrl: url,
      logoUrl: `${appBaseUrl()}/brand/panameer-new-on-light.png`,
    });
    await sendEmail({ to: email, subject: tpl.subject, html: tpl.html, text: tpl.text });
  } catch (e) {
    console.error("[assessment] report email failed", e);
  }

  return NextResponse.json({ ok: true, shareToken: a.share_token });
}
