import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getWorklist } from "@/lib/worklist";

/**
 * ── ⚠⚠⚠ WHAT'S WAITING ON YOU, ON THE BAND'S HOME (`P2-A3-E620` WS-C 3) ──
 *
 * ⚠ THE BRIEF: *"The worklist sits at the top of that page **and in the band's
 * home**."* The band's Home is `/dashboard` (`HOME_NAV`), measured.
 *
 * ⚠⚠ IT SELF-FETCHES ON PURPOSE. `/dashboard` branches four ways — provider,
 * requester, buyer, and the generic fallback — and threading a worklist prop
 * through all four would be four chances to forget one. ⚠ A server component
 * that asks for its own rows is one line per branch and cannot be passed the
 * wrong data.
 *
 * ⚠⚠⚠ IT RENDERS **NOTHING** AT ZERO, AND THAT IS DELIBERATE — the one place
 * in this brief an empty state is wrong. `/notifications` is a page ABOUT
 * notifications, so an empty one must say what will appear there. The home is
 * about everything else, and a permanent *"nothing is waiting on you"* panel
 * on the page a member sees every single day is furniture, not information.
 * ⚠ `decisions_2026-09-23` §5 is about a CARD whose absence removes a
 * capability's only entrance; this removes nothing — the bell, the page and
 * the `See All` link are all still there.
 */
export async function WorklistPanel({ userId }: { userId: string }) {
  const person = await prisma.person.findUnique({
    where: { user_id: userId },
    select: { id: true },
  });
  if (!person) return null;

  /* ⚠ Five, not twenty. This is the home page's summary; the full list is one
     tap away and says so. */
  const items = (await getWorklist(person.id, 6)).slice(0, 5);
  if (items.length === 0) return null;

  return (
    <section className="mb-5 rounded-brand border border-line bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        {/* ⚠ Title Case (`E568` / rule 11). */}
        <h2 className="font-display text-[16px] font-bold">Waiting on You</h2>
        <Link
          href="/notifications"
          className="text-[13px] font-bold text-magenta hover:underline"
        >
          See All
        </Link>
      </div>

      <ul className="mt-3 space-y-2">
        {items.map((n) => {
          const body = (
            <>
              <span className="block text-[14px] font-semibold text-ink">{n.title}</span>
              {n.body && (
                <span className="mt-0.5 block text-[13px] text-ink-2">{n.body}</span>
              )}
            </>
          );
          /*
            ⚠⚠⚠ EVERY ROW LINKS TO THE THING THAT CLEARS IT. The brief: *"each
            with the action that clears it."* ⚠ The `href` comes from the event
            registry, where it sits beside the `requiresAction` that put the
            item here — so the item and its exit are declared in one place and
            cannot drift apart.
            ⚠⚠ A ROW WITH NO `href` IS NOT RENDERED AS A DEAD LINK. It renders
            as text, because an anchor that goes nowhere is `E579`'s door onto
            a wall, and silently dropping the row would hide something the
            member owes.
          */
          return (
            <li key={n.id}>
              {n.href ? (
                <Link
                  href={n.href}
                  className="block rounded-brand border border-line p-3 transition-colors hover:border-magenta"
                >
                  {body}
                </Link>
              ) : (
                <div className="rounded-brand border border-line p-3">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
