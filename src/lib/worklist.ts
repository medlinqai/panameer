import { prisma } from "@/lib/prisma";

/**
 * ── ⚠⚠⚠ WHAT IS WAITING ON YOU — ONE DEFINITION (`P2-A3-E620` WS-C 3) ───
 *
 * ⚠ THE BRIEF: *"The worklist sits at the top of that page **and in the band's
 * home**: what's waiting on you, **oldest first**, each with the action that
 * clears it."*
 *
 * ⚠⚠⚠ IT IS A FUNCTION BECAUSE IT IS NEEDED IN TWO PLACES, AND THAT IS EXACTLY
 * THE SHAPE `E585` WARNS ABOUT. `/notifications` and `/dashboard` would
 * otherwise each carry their own copy of *"requires_action AND resolved_at IS
 * NULL AND delivered"*, and the day one of them gained a condition the two
 * pages would quietly disagree about what a member owes. ⚠ The same mistake
 * that shipped eight real rates to signed-out visitors on `/explore` (`E618`),
 * and the same remedy.
 *
 * ── ⚠⚠ WHY EACH CONDITION IS THERE ──────────────────────────────────────
 *
 * · `requires_action` — the registry's `requiresAction`, set per EVENT. It is
 *   a product fact about the event, never a member preference (ruling 13).
 * · `resolved_at IS NULL` — ⚠⚠⚠ **AN ITEM DISAPPEARS WHEN THE THING IS DONE,
 *   NOT WHEN IT IS READ** (ruling 34e). Reading clears the badge; only the
 *   action clears the item. Collapsing the two is how a worklist becomes a
 *   feed with extra steps.
 * · `delivered_in_app_at` — a `DIGEST` or `SILENT` row was never sent, so it
 *   must not appear in a list the member is being asked to act on.
 */
/**
 * ── ⚠⚠⚠ THE PREDICATE, SO BOTH READERS ASK THE SAME QUESTION ────────────
 *
 * ⚠ `getWorklist` below asks the DATABASE; `/notifications` applies the same
 * test to rows it has ALREADY fetched, because its worklist section has to
 * respect the filter the member picked. ⚠⚠ Two different mechanisms, and that
 * is fine — what must not differ is the RULE.
 * ⚠⚠⚠ SO THE RULE LIVES HERE ONCE AND BOTH CALL IT. Without this, the day
 * "waiting on you" gains a condition, the page and the home would disagree
 * about what a member owes — and the disagreement would show on two screens a
 * tap apart (`E585`).
 */
export function isWorklistItem(n: {
  requires_action: boolean;
  resolved_at: Date | null;
  delivered_in_app_at: Date | null;
}): boolean {
  return n.requires_action && n.resolved_at === null && n.delivered_in_app_at !== null;
}

export type WorklistItem = {
  id: string;
  title: string;
  body: string | null;
  href: string | null;
  at: Date;
};

export async function getWorklist(
  personId: string,
  take = 20
): Promise<WorklistItem[]> {
  const rows = await prisma.notification.findMany({
    where: {
      person_id: personId,
      requires_action: true,
      resolved_at: null,
      delivered_in_app_at: { not: null },
    },
    /*
      ⚠⚠ OLDEST FIRST, AND IT IS THE OPPOSITE OF THE FEED'S ORDER ON PURPOSE.
      A feed answers *"what happened"*, so the newest leads. A worklist answers
      *"what have I failed to do"*, and the thing that has waited longest is the
      thing that has been failed longest. ⚠ The Groups page's `Needs You` uses
      the same order, for the same reason.
    */
    orderBy: { created_at: "asc" },
    take,
    select: { id: true, title: true, body: true, href: true, created_at: true },
  });
  return rows.map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    href: n.href,
    at: n.created_at,
  }));
}

/** How many things are waiting on you. ⚠ A COUNT, not the rows — the band's
    home needs the number before it needs the list, and loading twenty rows to
    render one figure is the waste the per-view reads exist to avoid. */
export async function countWorklist(personId: string): Promise<number> {
  return prisma.notification.count({
    where: {
      person_id: personId,
      requires_action: true,
      resolved_at: null,
      delivered_in_app_at: { not: null },
    },
  });
}
