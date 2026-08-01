import Link from "next/link";
import { Suspense } from "react";
import { PublishedDialog } from "@/components/home/PublishedDialog";

/**
 * Provider HOME = the Opportunities dashboard (MASTER WS12, ref E151).
 *
 * FOUR KPI CARDS AND AN OPEN WORK TABLE — and every one of them is EMPTY,
 * because the transaction layer does not exist. There are no WorkRequest,
 * Order or Application models; nothing in this product can currently produce a
 * number for "Open Work Applied".
 *
 * The brief is explicit: stub with honest empty states, do NOT fabricate data.
 * So the cards read "—" rather than the mockup's placeholder 9s, and each says
 * what it is waiting for. A dashboard of invented nines is worse than an empty
 * one in a specific way — it looks finished, so nobody asks why the numbers
 * never change, and the first real number silently contradicts a screenshot
 * somebody already trusted.
 *
 * The layout is the mockup's, so wiring it later is a data change and not a
 * redesign.
 */

const KPIS = [
  {
    label: "Total Work Applied To YTD",
    waiting: "No applications yet",
  },
  {
    label: "Open Work Applied",
    waiting: "Nothing open",
  },
  {
    label: "New Work My Skills",
    waiting: "No matches yet",
  },
  {
    label: "My Packages",
    waiting: "None published",
  },
];

export function Opportunities() {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <Suspense fallback={null}>
        <PublishedDialog />
      </Suspense>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((k) => (
          <div key={k.label} className="rounded-brand border border-line bg-white p-5">
            <p className="text-[13.5px] text-ink-2">{k.label}</p>
            {/* An em-dash at 34px renders as a magenta BAR that reads like a
                progress meter. A muted "–" says "no number yet", which is the
                actual state. */}
            <p className="mt-1 font-display text-[34px] font-bold leading-none text-ink-2/30">
              –
            </p>
            <p className="mt-2 text-[13px] text-ink-2">{k.waiting}</p>
          </div>
        ))}
      </div>

      <section className="mt-6 overflow-hidden rounded-brand border border-line bg-white">
        <header className="flex flex-wrap items-center gap-4 px-6 py-5">
          <h2 className="font-display text-[19px] font-bold">Open Work</h2>
          <label className="ml-auto">
            <span className="sr-only">Search open work</span>
            <input
              type="search"
              placeholder="Search"
              disabled
              title="Search opens when work requests do"
              className="w-full min-w-[200px] rounded-[8px] border border-line px-3 py-2 text-[14px] outline-none disabled:bg-black/[0.02] disabled:text-ink-2"
            />
          </label>
        </header>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[14px]">
            <thead className="border-y border-line bg-bg-soft text-[13px] text-ink-2">
              <tr>
                <th className="px-6 py-3 font-semibold">Requester - Company</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Start Date</th>
                <th className="px-4 py-3 font-semibold">Message</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <p className="text-[15.5px] font-bold">
                    No open work yet.
                  </p>
                  <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-ink-2">
                    Buyers aren&apos;t posting work requests on Panameer yet. Your
                    profile is what they&apos;ll find you by — and free courses on
                    Learn are how you widen what they can find you for.
                  </p>
                  <span className="mt-4 flex flex-wrap justify-center gap-3">
                    <Link
                      href="/profile"
                      className="rounded-full bg-magenta px-6 py-2.5 text-[14px] font-bold text-white transition-colors hover:bg-magenta-dark"
                    >
                      Review My Profile
                    </Link>
                    <Link
                      href="/learn"
                      className="rounded-full border-[1.5px] border-line px-6 py-2.5 text-[14px] font-bold transition-colors hover:border-magenta hover:text-magenta"
                    >
                      Build Skills
                    </Link>
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
