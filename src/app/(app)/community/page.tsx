import Link from "next/link";
import { guardPage } from "@/lib/guard";
import { getSessionViewer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getCreditsSummary, formatCredits } from "@/lib/credits";
import {
  CREDIT_EARN_ACTIONS,
  CREDIT_SPEND_ACTIONS,
  communitySections,
} from "@/lib/community";

/**
 * THE COMMUNITY HUB (PHASE 2 / WS2-A).
 *
 * The front door to the whole community-and-earning story: the four sections,
 * what Community Credits are and how the earned door works, and the
 * group-session strip.
 *
 * REAL: the section cards (read from the same nav definition the rail uses, so
 * the hub cannot list a different set than the menu you came from) and the
 * Credits summary (through the `getCreditsSummary` seam, which returns a true
 * zero and a `pending` flag until PHASE 3's ledger lands).
 * PLACEHOLDER: the sessions strip — `GroupSession` is a PHASE 4 model and does
 * not exist, so the strip says what will be there rather than inventing a
 * Friday.
 *
 * THE EXPLAINER IS NOT DECORATION. Seats are earned rather than given, and an
 * earned currency only changes behaviour if the rule is legible — a currency
 * nobody understands is a currency nobody chases. So the earn actions and the
 * spend are stated before anyone has a balance worth looking at.
 */
export const metadata = { title: "Community · Panameer" };

export default async function CommunityPage() {
  await guardPage("authenticated");
  const viewer = await getSessionViewer();

  /*
    The person id, for the Credits seam. PHASE 1's implementation ignores it;
    PHASE 3 reads the ledger with it. Resolved here so the call site is already
    correct when the body behind it changes.
  */
  const person = viewer
    ? await prisma.person.findUnique({
        where: { user_id: viewer.userId },
        select: { id: true },
      })
    : null;

  const credits = await getCreditsSummary(person?.id ?? null);
  const sections = communitySections();

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header>
        <h1 className="font-display text-[26px] font-bold tracking-[-0.5px]">
          The Panameer Community
        </h1>
        <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-ink-2">
          Where practitioners answer each other&apos;s questions, teams find each
          other, and the people who have done the work make time for the people
          learning it.
        </p>
      </header>

      {/* ---- The four sections ------------------------------------------- */}
      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group rounded-brand border border-line bg-white p-5 transition-colors hover:border-magenta/40"
          >
            <div className="flex items-baseline gap-2">
              <h2 className="font-display text-[17px] font-bold group-hover:text-magenta">
                {s.label}
              </h2>
              {s.state === "early" && (
                <span className="rounded-full bg-black/[0.06] px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-ink-2">
                  Early
                </span>
              )}
            </div>
            <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">
              {s.blurb}
            </p>
          </Link>
        ))}
      </div>

      {/* ---- Credits: the balance, then the rule in plain language -------- */}
      <section className="rounded-brand border border-magenta/25 bg-magenta/[0.04] p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-[17px] font-bold">
              Community Credits
            </h2>
            <p className="mt-1 max-w-xl text-[14px] leading-relaxed text-ink-2">
              The currency you earn by taking part. Credits buy a seat at a
              Friday group session — they can&apos;t be bought with money, only
              earned.
            </p>
          </div>
          <div className="text-right">
            <p className="font-display text-[32px] font-bold leading-none text-magenta">
              {formatCredits(credits.balance)}
            </p>
            <p className="mt-1 text-[13px] text-ink-2">
              {formatCredits(credits.earnedThisWeek)} earned this week
            </p>
          </div>
        </div>

        {credits.pending && (
          <p className="mt-3 rounded-[10px] border border-dashed border-magenta/30 px-3 py-2 text-[13px] leading-relaxed text-ink-2">
            The Credits ledger isn&apos;t switched on yet, so everyone reads
            zero. Nothing you do now is being missed — earning starts when it
            goes live, and the rules below are what it will count.
          </p>
        )}

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <h3 className="text-[12px] font-bold uppercase tracking-[0.08em] text-ink-2">
              How You Earn
            </h3>
            <ul className="mt-2 space-y-2">
              {CREDIT_EARN_ACTIONS.map((a) => (
                <li key={a.action} className="text-[14px] leading-relaxed">
                  <span className="font-semibold">{a.action}</span>
                  <span className="text-ink-2"> — {a.detail}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-[12px] font-bold uppercase tracking-[0.08em] text-ink-2">
              What They Unlock
            </h3>
            <ul className="mt-2 space-y-2">
              {CREDIT_SPEND_ACTIONS.map((a) => (
                <li key={a.action} className="text-[14px] leading-relaxed">
                  <span className="font-semibold">{a.action}</span>
                  <span className="text-ink-2"> — {a.detail}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[13px] leading-relaxed text-ink-2">
              One-to-one time with a mentor is paid for in cash, not Credits —
              see{" "}
              <Link
                href="/community/mentors"
                className="font-semibold text-magenta hover:underline"
              >
                Find a Mentor
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      {/* ---- Group sessions: honestly empty until PHASE 4 ----------------- */}
      <section className="rounded-brand border border-line bg-white p-5">
        <h2 className="font-display text-[17px] font-bold">
          Upcoming Group Sessions
        </h2>
        <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-ink-2">
          Thirty minutes on a Friday with a senior practitioner, one-to-many. A
          seat costs Credits.
        </p>
        <div className="mt-4 rounded-[10px] border border-dashed border-line px-4 py-6 text-center">
          <p className="text-[14.5px] font-semibold">No sessions scheduled yet.</p>
          <p className="mx-auto mt-1 max-w-md text-[13.5px] leading-relaxed text-ink-2">
            Mentors publish their Friday sessions here once scheduling is
            switched on. Nothing is being hidden from you — there is genuinely
            nothing on the calendar.
          </p>
        </div>
      </section>
    </div>
  );
}
