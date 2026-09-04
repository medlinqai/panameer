"use client";

import { useEffect, useRef, useState } from "react";
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
 */
export function MemberSearchBox({ initial = "" }: { initial?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(initial);
  /* ⚠ Skip the first run: mounting with `?q=` already set would re-push the URL
     the page was just rendered from. */
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const t = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (value.trim()) next.set("q", value.trim());
      else next.delete("q");
      router.replace(next.toString() ? `/community?${next}` : "/community", { scroll: false });
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
