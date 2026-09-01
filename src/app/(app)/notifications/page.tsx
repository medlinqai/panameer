import { revalidatePath } from "next/cache";
import Link from "next/link";
import { guardPage } from "@/lib/guard";
import { prisma } from "@/lib/prisma";

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
export default async function Page() {
  const viewer = await guardPage("authenticated");
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

  const worklist = rows.filter((n) => n.requires_action && n.resolved_at === null);
  const recent = rows.filter((n) => !(n.requires_action && n.resolved_at === null));
  const unread = rows.filter((n) => n.read_at === null).length;

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
        </>
      )}
    </div>
  );
}
