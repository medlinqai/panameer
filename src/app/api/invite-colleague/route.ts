import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { inviteColleague } from "@/lib/colleague-invite";
import { ratesByPersonId } from "@/lib/provider-rates";

/**
 * SEND ONE COLLEAGUE INVITATION (`P2-J3-E493`).
 *
 * ⚠ `authenticated` — anyone with an account has colleagues. The rules that
 * matter here are not about ROLE, they are about ABUSE, and they live in
 * `lib/colleague-invite.ts`: a database-counted rate limit, one live invitation
 * per address per inviter, and a refusal to invite somebody who already has an
 * account.
 *
 * ⚠⚠ THE INVITER IS RESOLVED FROM THE SESSION AND NEVER ACCEPTED FROM INPUT.
 * A body-supplied `inviterPersonId` would let anyone send mail in anyone's name.
 */
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
    /* ⚠ EACH REFUSAL SAYS WHICH ONE IT IS. "Could not send" would leave a person
       re-trying a thing that will never work. */
    const map: Record<string, { msg: string; status: number }> = {
      rate_limited: {
        msg: "You've sent a lot of invitations recently. Try again in an hour.",
        status: 429,
      },
      /* ⚠⚠ `E525` — REACHED ONLY BY AN ADDRESS WHOSE `User` HAS NO `Person`.
         The ordinary already-a-member answer is a 200 below, with their card. */
      already_member: { msg: "They're already on Panameer — no invitation needed.", status: 409 },
      already_invited: { msg: "You've already invited them and it hasn't expired yet.", status: 409 },
      invalid: { msg: "That didn't look like an email address.", status: 400 },
    };
    const m = map[res.reason];
    return NextResponse.json({ error: m.msg }, { status: m.status });
  }

  /*
    ⚠⚠ `E525` — THEY ARE ALREADY HERE, SO THE ANSWER IS THEIR CARD, AT 200.
    Not a 409, not an `error` key, nothing the client can paint red. ⚠ NOTHING
    WAS WRITTEN getting here — no `ColleagueInvite` row, no email.

    ⚠ `profileId` IS RESOLVED THE WAY `/community`'s SEARCH RESOLVES IT, via
    `ratesByPersonId`, because `MemberRow` links the name ONLY when one exists.
    ⚠⚠ A MEMBER WITH NO ProviderProfile — every buyer — GETS A PLAIN NAME
    RATHER THAN A LINK TO A 404. The rate is deliberately not passed: an
    invitation card is not a shelf.
  */
  if (res.outcome === "already_member") {
    const facts = await ratesByPersonId([res.member.personId]);
    return NextResponse.json({
      ok: true,
      alreadyMember: { ...res.member, profileId: facts.get(res.member.personId)?.profileId ?? null },
    });
  }

  /* ⚠ `devLink` ONLY EXISTS WITH NO RESEND KEY — the same dev affordance
     verify-email and recommendations use, so the loop stays walkable locally. */
  return NextResponse.json({ ok: true, sent: res.sent, devLink: res.devLink });
}
