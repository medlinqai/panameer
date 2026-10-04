import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { inviteColleague } from "@/lib/colleague-invite";
import { ratesByPersonId } from "@/lib/provider-rates";

const Body = z.object({
  email: z.string().trim().email().max(320),
  firstName: z.string().trim().max(80).optional().nullable(),
  lastName: z.string().trim().max(80).optional().nullable(),
  message: z.string().trim().max(600).optional().nullable(),
});

export async function POST(req: Request) {
  const viewer = await guardApi("authenticated");
  if (viewer instanceof NextResponse) return viewer;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "That didn't look like an email address." }, { status: 400 });
  }

  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: { id: true },
  });
  if (!person) return NextResponse.json({ error: "No profile." }, { status: 400 });

  const res = await inviteColleague({
    inviterPersonId: person.id,
    viewer,
    email: parsed.data.email,
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName,
    message: parsed.data.message,
    origin: new URL(req.url).origin,
  });

  if (!res.ok) {
    const map: Record<string, { msg: string; status: number }> = {
      rate_limited: {
        msg: "You've sent a lot of invitations recently. Try again in an hour.",
        status: 429,
      },
      already_member: { msg: "They're already on Panameer — no invitation needed.", status: 409 },
      already_invited: { msg: "You've already invited them and it hasn't expired yet.", status: 409 },
      invalid: { msg: "That didn't look like an email address.", status: 400 },
    };
    const m = map[res.reason];
    return NextResponse.json({ error: m.msg }, { status: m.status });
  }

  if (res.outcome === "already_member") {
    const facts = await ratesByPersonId([res.member.personId]);
    return NextResponse.json({
      ok: true,
      alreadyMember: { ...res.member, profileId: facts.get(res.member.personId)?.profileId ?? null },
    });
  }

  return NextResponse.json({ ok: true, sent: res.sent, devLink: res.devLink });
}
