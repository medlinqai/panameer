import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardApi } from "@/lib/guard";
import { getSessionViewer } from "@/lib/session";

/**
 * The bell's short list, and marking ONE of them read (`P2-A3-E620` WS-C 1).
 *
 * ⚠ THE BRIEF: *"The bell shows the unread count (nothing when zero) and opens
 * a short list of the newest, with **See All**. ⚠ Reading one marks it read;
 * **opening the bell doesn't mark everything read**."*
 *
 * ── ⚠⚠⚠ WHY THE PANEL FETCHES INSTEAD OF BEING HANDED ITS ROWS ──────────
 *
 * ⚠ The band renders on EVERY authenticated page. Passing the newest rows
 * through it would put a notification query on every single render, for a panel
 * most of those renders never open. ⚠⚠ Fetching on open costs one query when
 * somebody actually looks, and it is FRESH — a list handed down at render time
 * is as old as the page, which on a long-lived tab is very old indeed.
 * ⚠ The COUNT still comes through `me`, because the badge must be right without
 * anybody opening anything.
 */

/* ⚠ Short. The panel is a glance, not the list — `See All` is one tap away. */
const TAKE = 6;

export async function GET() {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const viewer = await getSessionViewer();
  if (!viewer) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: { id: true },
  });
  if (!person) return NextResponse.json({ rows: [] });

  /*
    ⚠⚠ DELIVERED ONLY — the same filter `/notifications` and the bell's own
    count use. A `DIGEST` or `SILENT` row EXISTS but was never sent, so showing
    it here would put something in the panel that the badge never counted, and
    the two would disagree about what a notification is (`E585`).
  */
  const rows = await prisma.notification.findMany({
    where: { person_id: person.id, delivered_in_app_at: { not: null } },
    orderBy: { created_at: "desc" },
    take: TAKE,
    select: {
      id: true,
      title: true,
      href: true,
      read_at: true,
      created_at: true,
      requires_action: true,
      resolved_at: true,
    },
  });

  return NextResponse.json({
    rows: rows.map((n) => ({
      id: n.id,
      title: n.title,
      href: n.href,
      unread: n.read_at === null,
      /* ⚠ The panel marks an outstanding worklist item, because *"you owe an
         action"* is a different fact from *"you have not read this"* and the
         two are easy to confuse at a glance. */
      needsAction: n.requires_action && n.resolved_at === null,
      at: n.created_at,
    })),
  });
}

/**
 * ⚠⚠⚠ MARK **ONE** READ. Never all.
 *
 * ⚠ The brief is explicit that opening the bell does not mark everything read,
 * and this route is the reason that stays true: there is no "mark all" here to
 * reach for. ⚠⚠ `/notifications` has its own `Mark All Read` button, which is
 * a deliberate act with a label on it — that is a different thing from a side
 * effect of looking.
 *
 * ⚠⚠ OWNER-SCOPED: the `where` carries BOTH the id and the person, so a crafted
 * id cannot mark somebody else's notification read (load-bearing rule 5).
 */
export async function POST(request: Request) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const viewer = await getSessionViewer();
  if (!viewer) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const parsed = z
    .object({ id: z.string().uuid() })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "That isn't a valid request." }, { status: 400 });
  }

  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: { id: true },
  });
  if (!person) return NextResponse.json({ error: "No person." }, { status: 404 });

  /*
    ⚠⚠ `updateMany` WITH BOTH KEYS, NOT `update` BY ID. An `update` on an id
    that is not yours throws; this simply matches nothing, which is the right
    answer to a request that was never legitimate.
    ⚠ `read_at: null` in the where means re-reading does not rewrite the
    timestamp — the moment it was first read is the fact worth keeping.
  */
  const res = await prisma.notification.updateMany({
    where: { id: parsed.data.id, person_id: person.id, read_at: null },
    data: { read_at: new Date() },
  });

  /* ⚠⚠⚠ READING IS NOT RESOLVING, AND THIS ROUTE CANNOT RESOLVE. A worklist
     item stays until its action is done — that is the whole difference between
     a feed and a worklist, and `resolved_at` is deliberately absent above. */
  return NextResponse.json({ ok: true, marked: res.count });
}
