import Link from "next/link";

/**
 * THE ACCOUNT PITCH — what an account is FOR, at the moment it starts to matter
 * (D2 / E016.7).
 *
 * Learn is free and open, and D2 keeps it that way: nothing here is a wall.
 * This is what stands in the two places where a signed-out learner reaches an
 * action that genuinely needs an account — enrolling, and recording progress —
 * and its job is to make the account look worth having rather than to say no.
 *
 * ONE COMPONENT BECAUSE ONE PROMISE. The same sentence has to appear on the
 * path page and on every lesson page. Written twice it becomes two promises
 * within a release, and this one contains a claim about what a Panameer account
 * awards you — the kind of copy that must not drift.
 *
 * ⚠ WHAT IT CLAIMS, AND WHY IT IS WORDED LIKE THIS. D2's line is "earn
 * Community Credits and certifications as you learn — saved to your profile".
 * Certifications are real: passing a path's test writes a Certification row
 * with a public verify URL, and it hangs off a ProviderProfile, so it genuinely
 * cannot be awarded without an account. Community Credits are NOT yet:
 * `getCreditsSummary` returns a hard zero with `pending: true` and the ledger is
 * a later phase, so nothing in Learn awards any.
 *
 * So certifications lead in the present tense and Credits are future tense.
 * Promising a reward the system cannot currently grant would be the same
 * failure as a fabricated count — worse here, because it is the reason someone
 * hands over an email address.
 */
export function AccountPitch({
  callbackUrl,
  cta = "Create a free account",
}: {
  /** Where to return after signing in — always the page they were reading. */
  callbackUrl: string;
  cta?: string;
}) {
  return (
    <div className="rounded-brand border border-magenta/25 bg-magenta/6 p-5">
      <p className="text-[15px] font-bold text-ink">
        Create a free account to earn certifications as you learn.
      </p>
      <p className="mt-1.5 max-w-xl text-[14px] leading-relaxed text-ink-2">
        {/* ⚠ CREDITS COPY PARKED 2026-09-03 (`P1-ALL-E375`) — the feature is commented
            out, so a live surface must not keep promising it. See `src/lib/credits.ts`.
            ⚠ ONE COMPLETE TRAILING SENTENCE WAS REMOVED, NOT REWRITTEN: *"It's
            also where Community Credits will accrue."* The two sentences that
            remain stand on their own and no new copy was written. */}
        Your progress and certificates save to your profile, each with a public
        verify link you can share.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link
          href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          className="rounded-full bg-magenta px-6 py-2.5 text-[14.5px] font-bold text-white transition-colors hover:bg-magenta-dark"
        >
          {cta}
        </Link>
        <span className="text-[13px] text-ink-2">
          Free — we&apos;ll bring you straight back here.
        </span>
      </div>
    </div>
  );
}
