import { revalidatePath } from "next/cache";
import Link from "next/link";
import { guardPage } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { NOTIFICATION_CATEGORIES } from "@/lib/notification-categories";
import { isWorklistItem } from "@/lib/worklist";

export const dynamic = "force-dynamic";

/**
 * Notifications — the feed AND the worklist (`P1-ALL`, 2026-09-01).
 *
 * ⚠⚠ ONE TABLE, TWO VIEWS. Scott: *"much of Medlinq's notifications work like
 * Oracle cloud's notifications… or should i say worklist."* An Oracle worklist is
 * not a second inbox — it is the subset of your notifications WAITING ON YOU. So
 * "Needs your attention" is `requires_action && resolved_at IS NULL` over the same
 * rows "Recent" shows. Two tables would mean two write paths, two unread counts
 * and two places for an item to be missed.
 *
 * ⚠ SUPERSEDED, quoted not deleted — this page was a hard-coded empty state whose
 * comment read: *"The brief scopes the notifications BACKEND out, so this is
 * deliberately an empty state rather than invented rows: the header bell also
 * carries no count, because a '0' badge asserts something we haven't checked and a
 * fake number is worse than none."* That was honest and it is now satisfied: there
 * are real rows, so there is a real number, and the badge ships in this same change.
 *
 * ⚠ `DIGEST` AND `SILENT` ROWS DO NOT APPEAR HERE. They are recorded, not
 * delivered — `delivered_in_app_at` is the test, not existence.
 */
/**
 * ── ⚠⚠ THE FILTERS (`P2-A3-E620` WS-C item 2) ───────────────────────────
 *
 * ⚠ THE BRIEF: *"filters for **All · Unread · Work · Community**."*
 * ⚠⚠ A QUERY STRING, NOT STATE — each filter is a real URL, so it is linkable
 * and the back button works, and it needs no JavaScript. The same call
 * `/community/grow` and the Groups views made.
 * ⚠⚠⚠ `Work` AND `Community` ARE A PARTITION OF THE SAME ROWS, read off
 * `NotificationCategory.lane`. **Never a list of category keys written out
 * here** — that would be a second definition drifting against the first
 * (`E585`), and `check:notify-prefs` asserts the partition is total so no row
 * can become unreachable.
 * ⚠ An unknown value falls back to `all` rather than 404ing.
 */
const FILTERS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "work", label: "Work" },
  { key: "community", label: "Community" },
] as const;

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const viewer = await guardPage("authenticated");
  const sp = await searchParams;
  const filter = FILTERS.some((f) => f.key === sp.filter) ? sp.filter! : "all";
  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: { id: true },
  });

  const rows = person
    ? await prisma.notification.findMany({
        /* ⚠ DELIVERED ONLY. A digest or silent row exists but was never sent. */
        where: { person_id: person.id, delivered_in_app_at: { not: null } },
        orderBy: { created_at: "desc" },
        take: 100,
      })
    : [];

  /*
    ⚠⚠ THE UNREAD COUNT IS OF **ALL** ROWS, NOT THE FILTERED ONES. It drives
    `Mark All Read`, and that button means every notification — showing "3"
    while filtered to Work and then clearing eleven would be a button that does
    more than it says.
  */
  const unread = rows.filter((n) => n.read_at === null).length;

  /* ⚠ The lane comes from the CATEGORY, so a row whose category is unknown
     (an event registered after a category was renamed) falls out of both lanes
     rather than being silently filed under one. `check:notify-prefs` makes
     that impossible in the source; this is the runtime belt. */
  const laneOf = (categoryKey: string) =>
    NOTIFICATION_CATEGORIES.find((c) => c.key === categoryKey)?.lane ?? null;

  const shown = rows.filter((n) => {
    if (filter === "unread") return n.read_at === null;
    if (filter === "work" || filter === "community") return laneOf(n.category) === filter;
    return true;
  });

  /* ⚠⚠ THE PREDICATE IS `lib/worklist.ts`'s, NOT THIS PAGE'S. The band's home
     renders the same list through `getWorklist`, and the two must not be able
     to disagree about what a member owes (`E585`). ⚠ The rows here are already
     delivered-only by the query above, so the test's third condition is
     redundant HERE and load-bearing in the lib — which is exactly why it
     belongs in one place rather than being re-typed per caller. */
  const worklist = shown.filter(isWorklistItem);
  const recent = shown.filter((n) => !isWorklistItem(n));

  /*
    ⚠⚠ MARK-READ ON VIEW, AND READING IS NOT RESOLVING. Opening the page clears
    the badge; it does NOT clear the worklist. An actionable item stays until its
    action is done — that is the whole difference between a feed and a worklist,
    and collapsing the two is how Oracle-style worklists get ruined.
  */
  async function markAllRead() {
    "use server";
    const v = await guardPage("authenticated");
    const p = await prisma.person.findUnique({
      where: { user_id: v.userId },
      select: { id: true },
    });
    if (!p) return;
    await prisma.notification.updateMany({
      where: { person_id: p.id, read_at: null },
      data: { read_at: new Date() },
    });
    revalidatePath("/notifications");
  }

  const Row = ({ n }: { n: (typeof rows)[number] }) => {
    const inner = (
      <div
        className={
          "rounded-brand border border-line bg-white p-4 " +
          (n.read_at === null ? "border-l-[3px] border-l-magenta" : "")
        }
      >
        <p className="text-[15px] font-bold text-ink">{n.title}</p>
        {n.body && <p className="mt-1 text-[14px] text-ink-2">{n.body}</p>}
        <p className="mt-1 text-[12.5px] text-ink-2">
          {n.created_at.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </p>
      </div>
    );
    return n.href ? (
      <Link href={n.href} className="block transition-colors hover:opacity-90">
        {inner}
      </Link>
    ) : (
      inner
    );
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-[26px] font-bold tracking-[-0.5px]">
          Notifications
        </h1>
        {unread > 0 && (
          <form action={markAllRead} className="ml-auto">
            <button
              type="submit"
              className="rounded-full border-[1.5px] border-line px-4 py-1.5 text-[13.5px] font-bold text-ink transition-colors hover:border-[#d9d4e2]"
            >
              Mark All Read
            </button>
          </form>
        )}
      </div>

      {/* ── THE FILTERS ─────────────────────────────────────────────────
          ⚠ Links, not buttons — real URLs, shareable, no JavaScript needed.
          ⚠⚠ `aria-current` carries the active one for a screen reader; colour
          alone would not. ⚠ Phone first: the row WRAPS rather than scrolling,
          so a filter can never sit off-screen behind a hidden scrollbar. */}
      <nav aria-label="Filter notifications" className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const on = f.key === filter;
          return (
            <Link
              key={f.key}
              href={f.key === "all" ? "/notifications" : `/notifications?filter=${f.key}`}
              aria-current={on ? "page" : undefined}
              className={
                "inline-flex items-center gap-1.5 rounded-full border-[1.5px] px-4 py-2 text-[13.5px] font-bold transition-colors " +
                (on
                  ? "border-magenta bg-magenta text-white"
                  : "border-line text-ink-2 hover:border-magenta hover:text-magenta")
              }
            >
              {f.label}
              {/* ⚠⚠ THE UNREAD COUNT RIDES ITS OWN TAB AND ONLY ABOVE ZERO —
                  a `0` beside `Unread` is noise, and it is the one figure here
                  a member acts on. */}
              {f.key === "unread" && unread > 0 && (
                <span
                  className={
                    "rounded-full px-1.5 text-[11px] font-extrabold tabular-nums " +
                    (on ? "bg-white text-magenta" : "bg-ink text-white")
                  }
                >
                  {unread}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {rows.length === 0 ? (
        /* ⚠ THE ORIGINAL EMPTY-STATE TONE IS KEPT, per the brief — a genuinely
           empty feed should read the same as it always did. */
        <div className="mt-5 rounded-brand border border-line bg-white p-8 text-center">
          <p className="text-[16px] font-bold">Nothing yet.</p>
          <p className="mx-auto mt-2 max-w-md text-[14.5px] text-ink-2">
            When buyers respond to your applications, or a contract needs your
            attention, it will show up here.
          </p>
        </div>
      ) : (
        <>
          {worklist.length > 0 && (
            <section className="mt-6">
              <h2 className="text-[13px] font-bold uppercase tracking-[0.08em] text-ink-2">
                Needs Your Attention
              </h2>
              <div className="mt-3 space-y-3">
                {worklist.map((n) => (
                  <Row key={n.id} n={n} />
                ))}
              </div>
            </section>
          )}
          {/*
            ⚠⚠⚠ A FILTER THAT MATCHES NOTHING IS NOT AN EMPTY FEED, AND MUST NOT
            READ LIKE ONE. *"Nothing yet"* under a `Work` filter would tell a
            member they have no notifications at all, while eleven sit one tab
            away. ⚠ It names the filter it is about and offers the way back.
          */}
          {shown.length === 0 ? (
            <div className="mt-6 rounded-brand border border-line bg-white p-8 text-center">
              <p className="text-[15px] font-bold">Nothing under this filter.</p>
              <p className="mx-auto mt-2 max-w-md text-[14.5px] text-ink-2">
                You have {rows.length} {rows.length === 1 ? "notification" : "notifications"} in
                total.{" "}
                <Link href="/notifications" className="font-bold text-magenta hover:underline">
                  Show All
                </Link>
              </p>
            </div>
          ) : (
            recent.length > 0 && (
              <section className="mt-6">
                <h2 className="text-[13px] font-bold uppercase tracking-[0.08em] text-ink-2">
                  Recent
                </h2>
                <div className="mt-3 space-y-3">
                  {recent.map((n) => (
                    <Row key={n.id} n={n} />
                  ))}
                </div>
              </section>
            )
          )}
        </>
      )}
    </div>
  );
}
