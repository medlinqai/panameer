import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardApi } from "@/lib/guard";
import { emailDomain, isWorkDomain } from "@/lib/tos";

/**
 * GET /api/company/suggest — what the viewer's own signals say their company
 * might be called (E167 enhancement).
 *
 * Two sources, in order: the domain root of their work email, then the most
 * recent employer their résumé import produced. Both are hints about a NAME,
 * used to pre-fill a search box.
 *
 * IT CONFERS NOTHING. No membership, no approval, no company selection — those
 * stay where the company model put them, and auto-approval remains keyed to the
 * target company's own recorded email_domain, decided server-side. A suggestion
 * that granted access would reopen exactly the hole that model closed.
 */
export async function GET() {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;

  const person = await prisma.person.findUnique({
    where: { user_id: gate.userId },
    select: {
      user: { select: { email: true } },
      providerProfile: {
        select: {
          employers: {
            orderBy: [{ is_current: "desc" }, { start_date: "desc" }],
            take: 1,
            select: { name: true },
          },
        },
      },
    },
  });

  const domain = emailDomain(person?.user?.email);
  // "straterp.com" → "straterp". Free-mail domains say nothing about an
  // employer, so they never suggest one.
  const fromDomain =
    domain && isWorkDomain(domain) ? domain.split(".")[0] : null;
  const fromResume = person?.providerProfile?.employers?.[0]?.name ?? null;

  return NextResponse.json({
    suggestion: fromDomain || fromResume || null,
    source: fromDomain ? "email-domain" : fromResume ? "resume" : null,
  });
}
