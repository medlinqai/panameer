import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardApi } from "@/lib/guard";

/**
 * UNLOCK AN ACCOUNT (`P1-ALL-E528` PART A1).
 *
 * > **SCOTT, 2026-09-16:** *"We also need to allow the panameer admin to be able
 * > to uncheck the locked out checkbox."*
 *
 * ⚠⚠ FOUND BY SCOTT BEING LOCKED OUT OF HIS OWN APP WITH NO WAY BACK IN EXCEPT A
 * DEVELOPER WITH DATABASE ACCESS. Before this route, `grep` over `src/app/api`
 * for a write to `locked` returned NOTHING — the admin checkbox was decoration.
 *
 * ── ⚠⚠ IT CLEARS ALL THREE FIELDS, AND THAT IS THE WHOLE POINT ──────────────
 *
 *   `locked: false` · `locked_until: null` · `failed_login_attempts: 0`
 *
 * ⚠ CLEARING `locked` ALONE LEAVES A COUNTER ONE ATTEMPT FROM RE-LOCKING, and
 * the admin would swear the button does not work. This is not a guess: the
 * credentials provider re-locks at `MAX_FAILED_LOGINS` (`lib/auth.ts`), so an
 * account released at 5 attempts re-locks on the very next typo.
 *
 * ── ⚠ WHAT THIS DOES NOT TOUCH ──────────────────────────────────────────────
 *
 * ⚠⚠ `LOCKOUT_MINUTES` AND THE 30-MINUTE AUTO-RELEASE ARE UNCHANGED (`E252a`).
 * That mechanism is correct and this sits BESIDE it: the gaps it does not cover
 * are an INDEFINITE lock (`locked: true`, `locked_until: null`) which nothing
 * released, and a timed lock with no way to skip the wait.
 * ⚠ The password is not touched. Unlocking is not a credential reset.
 *
 * ── ⚠⚠ LOCKING IS NOT BUILT HERE, DELIBERATELY ─────────────────────────────
 *
 * The brief asked chat to report rather than decide, and the report is in the
 * hand-off: an admin who can unlock should probably be able to lock, and support
 * needs it for a compromised account — but it is a NEW POWER OVER A MEMBER and
 * it is Scott's call. ⚠ `action` is an enum with one member so that adding
 * `"lock"` later is an additive change to a shape that already exists, rather
 * than a re-design. ⚠⚠ A `"lock"` value is REJECTED by the schema today.
 */
const Body = z.object({
  /** ⚠ One member on purpose. See the header. */
  action: z.literal("unlock"),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  /*
    ⚠⚠ `canAdminister`, VIA `guardApi` — NEVER `roleWord()`. Standing house rule:
    `roleWord()` is the one-word header badge and is single-valued on purpose, so
    reading it as a permission is how a badge becomes an access rule.
    ⚠ The admin is resolved from the SESSION. Nothing about who is acting comes
    from the request body.
  */
  const viewer = await guardApi("canAdminister");
  if (viewer instanceof NextResponse) return viewer;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  }

  /*
    ⚠ THE PARAM IS A **PERSON** ID, because that is what `/admin/users/[id]`
    renders. The User is resolved from it here rather than accepted from the
    client — a body-supplied user id would let an admin page unlock an account
    that is not the one on screen.
  */
  const { id } = await params;
  const person = await prisma.person.findUnique({
    where: { id },
    select: { user: { select: { id: true, email: true } } },
  });
  if (!person?.user) {
    return NextResponse.json({ error: "No login on this record." }, { status: 404 });
  }

  const updated = await prisma.user.update({
    where: { id: person.user.id },
    /* ⚠⚠ ALL THREE, TOGETHER. See the header. */
    data: { locked: false, locked_until: null, failed_login_attempts: 0 },
    select: { locked: true, locked_until: true, failed_login_attempts: true },
  });

  return NextResponse.json({ ok: true, ...updated });
}
