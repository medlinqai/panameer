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

/* ═══════════════════════════════════════════════════════════════════════════
   ⚠⚠⚠ THE TWO VIEWS, FROM ONE `where` (`P2-A1.1-E736`)
   ═══════════════════════════════════════════════════════════════════════════

   ⚠ **SCOTT: *"Bell and worklist are one table with two views."*** Ruling 86, unchanged.
   ⚠⚠ `isWorklistItem` above is the in-memory predicate and these are its Prisma mirrors.
   ⚠⚠⚠ **THEY ARE BUILT FROM IT RATHER THAN RETYPED BESIDE IT** — `access.ts` records what
   happens when an in-memory predicate and a DB mirror drift: *"the two disagreed on 6 real
   profiles — visible on five surfaces, invisible on three, at the same moment."*
*/

/** ⚠ Everything that reached the member in-app and has not been dismissed. The TRIAGE view. */
export function triageWhere(personId: string) {
  return {
    person_id: personId,
    delivered_in_app_at: { not: null },
    /*
      ⚠⚠⚠ DISMISSED ROWS LEAVE THIS LIST AND NOTHING ELSE. ⚠ `E736` — Scott:
      *"Dismiss hides a row from this list. It doesn't delete it, and it doesn't resolve an
      action row."* The row keeps its `requires_action`, so `actWhere` below still returns
      it. **Hiding a request is not answering it.**
    */
    dismissed_at: null,
  };
}

/**
 * ⚠ Only what is waiting on the member. The ACT view.
 * ⚠⚠⚠ **IT DOES NOT FILTER ON `dismissed_at`, AND THAT IS THE WHOLE POINT.** A member who
 * dismisses an action row has tidied their inbox, not done the thing — so it stays here.
 */
export function actWhere(personId: string) {
  return {
    person_id: personId,
    requires_action: true,
    resolved_at: null,
    delivered_in_app_at: { not: null },
  };
}

export type TriageRow = {
  id: string;
  title: string;
  body: string | null;
  href: string | null;
  category: string;
  eventKey: string;
  at: Date;
  unread: boolean;
  needsAction: boolean;
};

const TRIAGE_SELECT = {
  id: true,
  title: true,
  body: true,
  href: true,
  category: true,
  event_key: true,
  created_at: true,
  read_at: true,
  requires_action: true,
  resolved_at: true,
  delivered_in_app_at: true,
} as const;

function toTriage(n: {
  id: string; title: string; body: string | null; href: string | null;
  category: string; event_key: string; created_at: Date; read_at: Date | null;
  requires_action: boolean; resolved_at: Date | null; delivered_in_app_at: Date | null;
}): TriageRow {
  return {
    id: n.id,
    title: n.title,
    body: n.body,
    href: n.href,
    category: n.category,
    eventKey: n.event_key,
    at: n.created_at,
    unread: n.read_at === null,
    /* ⚠ The SAME predicate the worklist uses, called — not two conditions retyped. */
    needsAction: isWorklistItem(n),
  };
}

/**
 * ── ⚠⚠ THE TRIAGE PAGE'S READ (`E736`) ─────────────────────────────────────────────────
 *
 * ⚠ **SCOTT: *"Load more: page by 25; no infinite list."*** ⚠⚠ It takes `take + 1` and
 * reports `more` from the overflow, so *"is there another page"* is **measured rather than
 * inferred from a full page** — a list whose last page happens to hold exactly 25 would
 * otherwise show a Load more that returns nothing.
 * ⚠ `unread` and `category` filter in the WHERE, not in memory. The old page sliced 100 rows
 * client-side, so a category beyond row 100 had no chip and no rows.
 */
export async function getTriage(
  personId: string,
  opts: { filter?: string; take?: number; cursor?: string } = {}
): Promise<{ rows: TriageRow[]; more: boolean }> {
  const take = opts.take ?? 25;
  const where: Record<string, unknown> = { ...triageWhere(personId) };
  if (opts.filter === "unread") where.read_at = null;
  else if (opts.filter && opts.filter !== "all") where.category = opts.filter;

  const rows = await prisma.notification.findMany({
    where,
    orderBy: { created_at: "desc" },
    take: take + 1,
    ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
    select: TRIAGE_SELECT,
  });
  return { rows: rows.slice(0, take).map(toTriage), more: rows.length > take };
}

/**
 * ⚠⚠ THE CHIPS, COUNTED IN THE DATABASE (`E736`).
 *
 * ⚠ **SCOTT: *"one chip per category THAT HAS ROWS (from the registry's categories; not
 * hard-coded)."*** ⚠⚠⚠ **IT IS A `groupBy`, NOT A TALLY OVER THE FETCHED PAGE.** Counting
 * what a page happens to hold means a category on page 2 has no chip — and the chip's job
 * is to get you to rows you cannot currently see.
 * ⚠ The LABEL comes from the registry; a row whose category the registry does not know is
 * counted under its raw key rather than dropped, because a chip nobody can explain is still
 * better than rows nobody can reach.
 */
export async function getTriageCounts(
  personId: string
): Promise<{ all: number; unread: number; byCategory: { key: string; n: number }[] }> {
  const base = triageWhere(personId);
  const [all, unread, grouped] = await Promise.all([
    prisma.notification.count({ where: base }),
    prisma.notification.count({ where: { ...base, read_at: null } }),
    prisma.notification.groupBy({
      by: ["category"],
      where: base,
      _count: { _all: true },
    }),
  ]);
  return {
    all,
    unread,
    byCategory: grouped
      .map((g) => ({ key: g.category, n: g._count._all }))
      .sort((a, b) => b.n - a.n || a.key.localeCompare(b.key)),
  };
}

export type ActRow = TriageRow & { resolved: boolean };

/**
 * ── ⚠⚠ THE WORKLIST'S READ (`E736`) ────────────────────────────────────────────────────
 *
 * ⚠ **`status` IS `open` BY DEFAULT** (Scott). ⚠⚠ `completed` and `any` read the SAME
 * `requires_action` set with the `resolved_at` condition relaxed — so a completed row is one
 * that left Open, never a different kind of row.
 * ⚠⚠⚠ **"DUE SOON" IS NOT HERE AND CANNOT BE: there is no due-date field on this table.**
 * Scott dropped the view when the premise reported it. ⚠ A view sorted on a column that does
 * not exist would have had to invent one.
 */
export async function getActList(
  personId: string,
  opts: { status?: "open" | "completed" | "any"; q?: string; category?: string } = {}
): Promise<ActRow[]> {
  const status = opts.status ?? "open";
  const where: Record<string, unknown> = {
    person_id: personId,
    requires_action: true,
    delivered_in_app_at: { not: null },
  };
  if (status === "open") where.resolved_at = null;
  else if (status === "completed") where.resolved_at = { not: null };
  if (opts.category) where.category = opts.category;
  const term = opts.q?.trim();
  if (term && term.length >= 2) {
    where.OR = [
      { title: { contains: term, mode: "insensitive" } },
      { body: { contains: term, mode: "insensitive" } },
    ];
  }
  const rows = await prisma.notification.findMany({
    where,
    /* ⚠ OLDEST FIRST — `getWorklist`'s reason, inherited: the thing that has waited
       longest is the thing that has been failed longest. */
    orderBy: { created_at: "asc" },
    take: 200,
    select: TRIAGE_SELECT,
  });
  return rows.map((n) => ({ ...toTriage(n), resolved: n.resolved_at !== null }));
}

/** ⚠ The left rail's counts. One query per saved view, all in parallel. */
export async function getActCounts(
  personId: string
): Promise<{ open: number; pastDay: number; pastWeek: number; byCategory: { key: string; n: number }[] }> {
  const base = actWhere(personId);
  const day = new Date(Date.now() - 86_400_000);
  const week = new Date(Date.now() - 7 * 86_400_000);
  const [open, pastDay, pastWeek, grouped] = await Promise.all([
    prisma.notification.count({ where: base }),
    /* ⚠⚠ "PAST DAY" MEANS WAITING LONGER THAN A DAY, NOT CREATED IN THE LAST DAY.
       ⚠⚠⚠ A worklist measures how long something has been owed; the other reading would
       make the view empty out as things got WORSE. */
    prisma.notification.count({ where: { ...base, created_at: { lt: day } } }),
    prisma.notification.count({ where: { ...base, created_at: { lt: week } } }),
    prisma.notification.groupBy({ by: ["category"], where: base, _count: { _all: true } }),
  ]);
  return {
    open,
    pastDay,
    pastWeek,
    byCategory: grouped
      .map((g) => ({ key: g.category, n: g._count._all }))
      .sort((a, b) => b.n - a.n || a.key.localeCompare(b.key)),
  };
}
