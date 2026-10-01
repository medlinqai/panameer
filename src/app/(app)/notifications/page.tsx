import { guardPage } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { findCategory } from "@/lib/notification-categories";
import { getTriage, getTriageCounts, countWorklist } from "@/lib/worklist";
import { TriageList, type Chip } from "@/components/notifications/TriageList";

export const dynamic = "force-dynamic";
export const metadata = { title: "Notifications · Panameer" };

/**
 * ── ⚠⚠⚠ THE TRIAGE LIST (`P2-A1.1-E736` WS-A) ───────────────────────────────────────────
 *
 * ⚠ **SCOTT, 2026-10-01: *"Please copy from medlinq… which copied from Oracle Cloud. This
 * is not usable at scale."***
 *
 * ⚠⚠ **WHAT WAS ACTUALLY WRONG, MEASURED BEFORE REBUILDING:** a hard `take: 100` with no
 * pagination (row 101 unreachable) · **filtering done in memory over those 100 rows**, so a
 * category beyond the cut had no rows and no chip · four hard-coded filters rather than the
 * registry's categories · a card per row in a 672px column · no selection, no bulk action,
 * no per-row controls, and no relative time.
 *
 * ⚠⚠⚠ **EVERY FILTER AND EVERY COUNT NOW HAPPENS IN THE DATABASE.** The chips come from a
 * `groupBy`, not a tally of the page — a chip's job is to reach rows you cannot currently
 * see, and one counted from the visible page can only ever describe the page.
 *
 * ⚠ **THE WORKLIST SECTION IS GONE FROM THIS PAGE** and lives at `/worklist` (WS-B). Two
 * surfaces showing "needs your attention" from two queries is `E585`; `isWorklistItem` is
 * still the one predicate and both pages call it.
 * ⚠ SUPERSEDED, quoted not deleted (`E164`) — this page's own description of itself:
 * //   Notifications — the feed AND the worklist (`P1-ALL`, 2026-09-01).
 * //   ⚠⚠ ONE TABLE, TWO VIEWS … so "Needs your attention" is `requires_action &&
 * //   resolved_at IS NULL` over the same rows "Recent" shows.
 * ⚠⚠ **THAT SENTENCE IS STILL TRUE — the two views simply have two URLs now.**
 *
 * ⚠ **`DIGEST` AND `SILENT` ROWS STILL DO NOT APPEAR.** `delivered_in_app_at` is the test,
 * not existence — unchanged, and now expressed once in `triageWhere`.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; after?: string }>;
}) {
  const viewer = await guardPage("authenticated");
  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: { id: true },
  });
  if (!person) return null;

  const sp = await searchParams;
  const filter = sp.filter ?? "all";

  const [{ rows, more }, counts, openCount] = await Promise.all([
    getTriage(person.id, { filter, cursor: sp.after }),
    getTriageCounts(person.id),
    /* ⚠ `countWorklist` existed with ZERO callers before this brief. The number is the
       reason to follow the link, so it travels with it rather than being discovered. */
    countWorklist(person.id),
  ]);

  /*
    ── ⚠⚠⚠ THE CHIPS COME FROM THE REGISTRY, NOT A LIST WRITTEN HERE ────────────────────

    ⚠ **SCOTT: *"one chip per category THAT HAS ROWS (from the registry's categories; not
    hard-coded)."*** ⚠⚠ `getTriageCounts` returns the keys that have rows; `findCategory`
    supplies each label.
    ⚠⚠⚠ **A CATEGORY THE REGISTRY DOES NOT KNOW IS STILL GIVEN A CHIP, UNDER ITS RAW KEY.**
    `check:notifications` fails the build on an unknown category, so this should be
    unreachable — but if it ever happens, **rows nobody can reach is the worse failure**
    than a chip whose label is ugly. The old page silently dropped such a row from both
    lanes.
  */
  const chips: Chip[] = [
    { key: "all", label: "All", n: counts.all },
    { key: "unread", label: "Unread", n: counts.unread },
    ...counts.byCategory.map((c) => ({
      key: c.key,
      label: findCategory(c.key)?.label ?? c.key,
      n: c.n,
    })),
  ];

  return (
    <div className="account-surface px-4 py-6 sm:px-6">
      <TriageList
        rows={rows.map((r) => ({ ...r, at: r.at.toISOString() }))}
        chips={chips}
        filter={filter}
        more={more}
        openCount={openCount}
        unreadCount={counts.unread}
        /* ⚠⚠ ONE CLOCK, passed from the server, so every row in the list is measured
           against the same instant and the server and the browser agree. A `Date.now()`
           inside the component is a hydration mismatch waiting for a slow render. */
        /*
          ⚠⚠ THE LINT RULE IS ABOUT CLIENT RENDER PURITY AND THIS IS A SERVER COMPONENT.
          ⚠ `Date.now()` here is the REQUEST TIME, which is exactly the value wanted: one
          clock for the whole list, resolved on the server, so every row is measured
          against the same instant and the markup the browser hydrates already agrees.
          ⚠⚠⚠ THE ALTERNATIVES ARE BOTH WORSE: a module-scope constant freezes at build,
          and computing it in the browser reintroduces the hydration mismatch `short-time.ts`
          takes an argument to avoid.
        */
        // eslint-disable-next-line react-hooks/purity
        now={Date.now()}
      />
    </div>
  );
}
