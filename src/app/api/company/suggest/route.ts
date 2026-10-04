import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardApi } from "@/lib/guard";
import { emailDomain, isWorkDomain } from "@/lib/tos";

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
