import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { prisma } from "@/lib/prisma";

/**
 * ── ⚠⚠⚠ THE BULK ACTIONS (`P2-A1.1-E736`) ──────────────────────────────────────────────
 *
 * ⚠ **SCOTT: *"a checkbox per row… N selected · Mark Read · Dismiss"*, plus *"Mark All
 * Read"* and *"Dismiss All"* at the top right.**
 *
 * ── ⚠⚠⚠ OWNER-SCOPED, AND IT IS `updateMany` FOR THAT REASON ───────────────────────────
 *
 * ⚠ Every mutation carries **BOTH** `person_id` and the ids. ⚠⚠ `updateMany` rather than
 * `update` so a crafted id belonging to somebody else matches **zero rows and succeeds**,
 * rather than throwing a not-found that confirms the row exists. ⚠⚠⚠ **THE TARGET IS
 * RESOLVED FROM THE SESSION, NEVER ACCEPTED FROM THE BODY** (load-bearing rule 5) — the
 * body carries ids to act on, never a person.
 *
 * ── ⚠⚠ WHAT THIS ROUTE CANNOT DO ───────────────────────────────────────────────────────
 *
 * ⚠⚠⚠ **IT CANNOT RESOLVE AN ACTION ROW, AND THAT IS DELIBERATE.** `resolved_at` means
 * *"the thing it asked for is done"*, and only the domain that owns the thing can know
 * that — the six existing writers are all side effects of a real decision (a group request
 * answered, a proposal accepted). ⚠ **A button that marked an obligation done without doing
 * it would be a lie the member tells themselves.** `dismiss` is the honest version: it
 * hides the row and leaves the obligation standing.
 */
const Body = z.object({
  action: z.enum(["read", "dismiss", "read_all", "dismiss_all"]),
  /** ⚠ Required for the two id-scoped actions, ignored by the two `_all` ones. */
  ids: z.array(z.string().uuid()).max(200).optional(),
});

export async function POST(req: Request) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const person = await prisma.person.findUnique({
    where: { user_id: gate.userId },
    select: { id: true },
  });
  if (!person) return NextResponse.json({ error: "No person" }, { status: 404 });

  const { action, ids } = parsed.data;
  const now = new Date();

  /*
    ⚠⚠ THE `_all` ACTIONS ARE SCOPED TO WHAT THE MEMBER CAN ACTUALLY SEE — delivered, not
    already dismissed. ⚠⚠⚠ WITHOUT `delivered_in_app_at` THEY WOULD ALSO MARK DIGEST AND
    SILENT ROWS, which the member was never shown: "Mark All Read" would quietly clear
    things that had never been in front of them.
  */
  const mine = {
    person_id: person.id,
    delivered_in_app_at: { not: null },
    dismissed_at: null,
  };

  if (action === "read_all") {
    const r = await prisma.notification.updateMany({
      where: { ...mine, read_at: null },
      data: { read_at: now },
    });
    return NextResponse.json({ ok: true, count: r.count });
  }

  if (action === "dismiss_all") {
    const r = await prisma.notification.updateMany({
      where: mine,
      data: { dismissed_at: now },
    });
    return NextResponse.json({ ok: true, count: r.count });
  }

  if (!ids?.length) {
    return NextResponse.json({ error: "No rows selected" }, { status: 400 });
  }

  const r = await prisma.notification.updateMany({
    where: { id: { in: ids }, person_id: person.id },
    data:
      action === "read"
        ? /* ⚠ Idempotent: re-reading does not rewrite the stamp. */
          { read_at: now }
        : { dismissed_at: now },
  });
  return NextResponse.json({ ok: true, count: r.count });
}
