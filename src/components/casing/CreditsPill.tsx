"use client";

import Link from "next/link";
import { useState } from "react";
import { formatCredits, type CreditsSummary } from "@/lib/credits";

/**
 * The Community Credits pill (WS1-D).
 *
 * Top-right of the header, primary magenta, reading
 * `Community Credits {balance} | {earnedThisWeek} This Week`.
 *
 * DISPLAY-ONLY IN PHASE 1 — there is no spend flow yet. It is still a LINK, to
 * /community, because the one thing a person seeing an unfamiliar currency
 * wants is to find out what it is, and Phase 2's hub is where that explanation
 * lives.
 *
 * IT SAYS WHEN IT IS NOT REAL. While `pending` is true the pill carries a
 * "Coming soon" marker, so a walk-through can't mistake a structural zero for a
 * measured one. Phase 3 returns `pending: false` from the same hook and the
 * marker disappears with no other change here.
 */
export function CreditsPill({ summary }: { summary: CreditsSummary }) {
  return (
    <Link
      href="/community"
      title={
        summary.pending
          ? "Community Credits are the earned currency for group sessions. The ledger goes live in a later phase."
          : "Community Credits — earn them by taking part, spend them on group sessions."
      }
      className="inline-flex shrink-0 items-center gap-2 rounded-full bg-magenta px-3.5 py-2 text-[13px] font-bold text-white transition-colors hover:bg-magenta-dark"
    >
      <SparkIcon />
      <span className="hidden sm:inline">Community Credits</span>
      <span className="tabular-nums">{formatCredits(summary.balance)}</span>
      <span aria-hidden className="text-white/45">
        |
      </span>
      <span className="whitespace-nowrap tabular-nums font-semibold text-white/85">
        {formatCredits(summary.earnedThisWeek)} This Week
      </span>
      {summary.pending && (
        <span className="hidden rounded-full bg-white/20 px-2 py-0.5 text-[10.5px] font-extrabold uppercase tracking-wide md:inline">
          Coming soon
        </span>
      )}
    </Link>
  );
}

/**
 * The header's search box (WS1-D).
 *
 * The deck puts a search bar in the centre of the header. It submits to
 * /search, which already exists as the rail's search destination — so this is
 * wiring, not a new surface, and a query typed here arrives somewhere that
 * knows it received it.
 */
export function HeaderSearch() {
  /*
    A controlled input seeded with "" — identical on the server and after
    hydration, so no mount dance is needed. (An earlier draft deferred the
    render until mounted; that was defending against a mismatch that a
    controlled empty field cannot produce.)
  */
  const [q, setQ] = useState("");

  return (
    <form
      action="/search"
      className="hidden min-w-0 flex-1 justify-center lg:flex"
      role="search"
    >
      <div className="flex w-full max-w-[420px] items-center gap-2 rounded-full border border-line bg-canvas px-3.5 py-1.5">
        <SearchIcon />
        <input
          name="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search Panameer…"
          aria-label="Search Panameer"
          className="min-w-0 flex-1 bg-transparent py-1 text-[14px] outline-none placeholder:text-ink-2/70"
        />
      </div>
    </form>
  );
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
      <path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0 text-ink-2"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  );
}
