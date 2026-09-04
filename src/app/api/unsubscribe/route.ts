import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { suppress, verifyUnsubscribeToken } from "@/lib/unsubscribe";
import { normalizeEmail } from "@/lib/normalizeEmail";

/**
 * POST /api/unsubscribe — public, no auth (`P1-ALL-E386`).
 *
 * ⚠⚠ THE TOKEN IS THE AUTHORISATION AND IT IS RE-VERIFIED HERE. The page
 * rendering a button is not an authorisation; this endpoint is reachable with
 * curl, and a raw email in the body without a valid signature must do nothing.
 *
 * ⚠ NO SESSION IS READ AND NONE IS REQUIRED. The entire point is that this works
 * for a signed-out recipient and for an address with no account.
 */
const Body = z.object({
  email: z.string().email(),
  category: z.string().nullable(),
  token: z.string().min(1),
  scope: z.enum(["category", "all"]),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const { email, category, token, scope } = parsed.data;

  /* ⚠ THE SIGNATURE IS OVER THE CATEGORY THE LINK WAS ISSUED FOR. A token for
     one category cannot be replayed to suppress a different one — the scope
     may widen to "all", which is strictly less mail and is the secondary action
     the page offers, but it can never be narrowed onto somebody else's
     category. */
  if (!verifyUnsubscribeToken(email, category, token)) {
    return NextResponse.json({ error: "This link isn't valid." }, { status: 403 });
  }

  await suppress(email, scope === "all" ? null : category, "unsubscribe_link");

  /*
    ⚠⚠ A SIGNED-IN PERSON'S PREFERENCE ROW IS WRITTEN TOO, so the settings screen
    and the email footer cannot disagree about what somebody chose.

    ⚠ IT IS KEYED FROM THE **TOKEN'S** EMAIL, never from a session — this route
    has no session. If that address happens to have a Person, its preferences are
    updated; if not, the suppression row alone carries the decision, which is the
    case `NotificationPreference` structurally cannot serve.
  */
  const person = await prisma.person.findFirst({
    where: { user: { is: { email: normalizeEmail(email) } } },
    select: { id: true },
  });
  if (person) {
    const cats = scope === "all" || !category ? null : category;
    if (cats) {
      await prisma.notificationPreference.updateMany({
        where: { person_id: person.id, category: cats },
        data: { email: false },
      });
    } else {
      await prisma.notificationPreference.updateMany({
        where: { person_id: person.id },
        data: { email: false },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
