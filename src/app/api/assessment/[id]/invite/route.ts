import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/normalizeEmail";
import { appBaseUrl } from "@/lib/verification";
import { sendEmail } from "@/lib/resend";
import { assessmentInviteTemplate } from "@/lib/email/templates/assessment-ready";

const Body = z.object({
  process: z.enum(["P2P", "O2C", "R2R", "H2R"]),
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(320),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: shareToken } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "That name or email didn't look right." }, { status: 400 });
  }
  const { process, name } = parsed.data;
  const email = normalizeEmail(parsed.data.email);

  const a = await prisma.assessment.findUnique({
    where: { share_token: shareToken },
    select: { id: true, company_name: true, process: true, _count: { select: { invites: true } } },
  });
  if (!a) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (process === a.process) {
    return NextResponse.json(
      { error: "You already completed that one." },
      { status: 400 }
    );
  }
  if (a._count.invites >= 3) {
    return NextResponse.json({ error: "All three are already sent." }, { status: 400 });
  }

  const invite = await prisma.assessmentInvite.upsert({
    where: {
      assessment_id_process_email: { assessment_id: a.id, process, email },
    },
    update: { name, sent_at: new Date() },
    create: { assessment_id: a.id, process, name, email },
  });

  const PROCESS_NAMES: Record<string, string> = {
    P2P: "Procure-to-Pay",
    O2C: "Order-to-Cash",
    R2R: "Record-to-Report",
    H2R: "Hire-to-Retire",
  };

  try {
    const tpl = assessmentInviteTemplate({
      fromName: a.company_name,
      companyName: a.company_name,
      processName: PROCESS_NAMES[process] ?? process,
      /* Re-enters the flow at the questions step for THAT process (WS-E). */
      assessUrl: `${appBaseUrl()}/assess?process=${process}&from=${shareToken}`,
      logoUrl: `${appBaseUrl()}/brand/panameer-lockup-ink.png`,
    });
    await sendEmail({
      to: email,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
      template: "invite-provider",
      subjectType: "AssessmentInvite",
      subjectId: invite.id,
    });
  } catch (e) {
    // Same rule as the report email: the invite row is the record, the send is
    // best-effort. Losing the row because Resend blipped is the worse failure.
    console.error("[assessment] invite email failed", e);
  }

  return NextResponse.json({ ok: true });
}
