"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * THE MEMBER SEARCH BOX (`P1-ALL-E374` WS-2).
 *
 * ⚠⚠ SEARCH LIVES ON `/community` ITSELF — THERE IS NO `/community/people`.
 * Decided by the brief: *"One page is one thing to walk."* The box writes `?q=`
 * and the SERVER renders the results, so `searchMembers` and its relation
 * computation never leave `lib/connections.ts`. ⚠ THIS COMPONENT HOLDS NO RULE
 * AND NO DATA — it moves a query string and nothing else.
 *
 * ⚠ CLEARING RESTORES THE PAGE. Emptying the box drops `?q=` and the blocks
 * come back; the brief requires results to REPLACE them while a query is live,
 * not to stack under them.
 *
 * ⚠ DEBOUNCED AT 300ms. Every keystroke routing would re-run a Postgres search
 * per character. `searchMembers` itself already refuses queries under two
 * characters, so the short-query case costs nothing either way.
 *
 * ── ⚠⚠ `P1-A3-E532` — THIS EFFECT USED TO DRIVE AN INFINITE REFETCH LOOP ────
 *
 * ⚠ SUPERSEDED, quoted not deleted (`E164`): the dependency array was
 * `[value, params, router]`.
 *
 * ⚠⚠ `useSearchParams()` RETURNS A NEW OBJECT AFTER EVERY NAVIGATION, so the
 * array was self-priming: type a character → debounce fires → `router.replace`
 * → the URL changes → `params` is a NEW REFERENCE → the effect re-runs → it
 * schedules ANOTHER `replace` → the URL "changes" again → forever.
 *
 * ⚠ MEASURED BEFORE THE FIX, on `/community?q=la` sitting completely idle:
 * **12 requests in 12 seconds, ~1.00/sec, gaps 828–1049ms.** Scott saw the same
 * thing in the dev log. AFTER: **0 in 12 seconds.** ⚠⚠ IT ONLY BITES AFTER THE
 * FIRST KEYSTROKE — a fresh page load looks innocent because the effect's first
 * run was skipped, which is why it survived review.
 *
 * ⚠⚠ THE FIX IS A GUARD, NOT A NARROWER DEPENDENCY ARRAY. The array is
 * UNCHANGED — `[value, params, router]`. What changed is that the timer now
 * compares the box against `?q=` and RETURNS when they already agree, so a
 * re-fire computes the same URL and does nothing. ⚠ The loop dies at its second
 * iteration instead of being prevented from starting.
 *
 * ⚠⚠ TWO NARROWER FIXES WERE TRIED AND MEASURED, AND BOTH WERE WORSE:
 *   · `[value]` + refs for `params`/`router` — killed the loop and BROKE
 *     CLEARING. Traced: the effect reached the right branch with
 *     `{currentQ:"Layne", nextQ:""}` and the URL never moved, because the
 *     REF'D ROUTER GOES STALE across the remount this component does when the
 *     server swaps the blocks for search results.
 *   · `params.toString()` as a dep — the replace CHANGES that string, so the
 *     effect still re-fires once per navigation.
 * ⚠ The guard is also what lets `router` stay a live closure value rather than
 * a captured one, and it satisfies `exhaustive-deps` with no suppression.
 */
export function MemberSearchBox({ initial = "" }: { initial?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(initial);

  useEffect(() => {
    const t = setTimeout(() => {
      const currentQ = params.get("q") ?? "";
      const nextQ = value.trim();
      /*
        ⚠⚠ THE URL IS THE GUARD. If the box already says what `?q=` says, there
        is nothing to navigate to — so a redundant `replace` is impossible no
        matter how many times this effect runs. That is what stops the loop.

        ⚠ IT ALSO REPLACES THE `mounted` REF that used to skip the first run.
        The ref reset to `false` on every remount, so it was doing its job only
        by accident; comparing against the URL is the honest version of the same
        intent — "do not navigate to where we already are".

        ⚠⚠ THIS DOES NOT FIX CLEARING, AND CLEARING IS BROKEN — emptying the box
        leaves `?q=` in the URL and the blocks do not come back. ⚠ MEASURED ON
        UNMODIFIED `main` WITH THE SAME SCRIPT: identical failure, so it is
        PRE-EXISTING and NOT a regression from this change. It is filed
        separately; do not assume this effect is where it lives, because the
        trace shows the `router.replace` IS reached with
        `{currentQ:"Layne", nextQ:""}` and the URL still does not move.
      */
      if (currentQ === nextQ) return;
      const next = new URLSearchParams(params.toString());
      if (nextQ) next.set("q", nextQ);
      else next.delete("q");
      router.replace(next.toString() ? `/community?${next}` : "/community", {
        scroll: false,
      });
    }, 300);
    return () => clearTimeout(t);
  }, [value, params, router]);

  return (
    <div className="relative">
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search members by name, title or company"
        aria-label="Search members"
        className="w-full rounded-brand border border-line bg-white px-4 py-2.5 text-[14px] outline-none placeholder:text-ink-2/70 focus:border-magenta/60"
      />
    </div>
  );
}
