"use client";

import Link from "next/link";

/**
 * WHAT A SIGNED-IN VISITOR SEES WHEN `/join/buyer` OR `/join/requester` HAS
 * NOTHING FOR THEM — `P1-J1.2-E009`.
 *
 * ── ⚠ THE OLD MESSAGE WAS WRONG IN THE ONE CASE IT MOST NEEDED TO BE RIGHT ───
 *
 * It said *"You're already signed in — This account isn't a buyer account."* with
 * one link, to `/dashboard`. Read that as the person it is aimed at: somebody
 * signed in, on `/join/buyer`, TRYING TO BECOME A BUYER. The page told them they
 * are not the thing they are in the middle of becoming, and then sent them
 * somewhere else. That closed the loop `P1-J1.2-E004` had just opened:
 *
 *     /create-work → /company?blocked=… → /join → /join/buyer
 *       → "This account isn't a buyer account." → /dashboard, and nowhere else.
 *
 * ── ⚠ AND THE ROUTE CANNOT TELL YOU WHY, SO THIS DOES NOT GUESS ──────────────
 *
 * Both status routes collapse several causes into ONE 404. `loadBuyer` throws
 * `NOT_A_BUYER` when there is no `Person`, OR when `is_service_buyer` is false,
 * OR when there is no `BuyerProfile`; `getRequesterState` throws
 * `NOT_A_REQUESTER` whenever `requesterProfile` is missing, and a requester has
 * no type flag at all, so on that route the two causes are not merely conflated
 * — they are indistinguishable in principle without new logic.
 *
 * So the copy states ONLY the fact the 404 actually establishes — this account
 * has no profile of this type — and never asserts the cause. "This account isn't
 * a buyer account" was a guess, and it was the wrong guess for the person most
 * likely to be reading it. Distinguishing the causes properly means changing the
 * error codes in `lib/onboarding.ts` and `lib/requester-onboarding.ts`, which
 * other callers switch on; that is a separate brief.
 *
 * ── ⚠ THE WAY FORWARD HAS TO BE A DOOR, NOT A SIGNPOST ───────────────────────
 *
 * `/company` is the ONLY UI in the codebase that can write a `CompanyMembership`
 * outside the two wizards that refuse an account in this state, and setting up
 * the company is genuinely the first step on either path. So it is the primary
 * link, and `/dashboard` is demoted to a quiet secondary.
 *
 * ⚠ AND WHEN THE VISITOR ARRIVED FROM A `?blocked=` REDIRECT, `blocked` AND
 * `from` ARE CARRIED BACK, so `/company` re-renders the reason its door closed
 * and `CompanyStepInline` keeps the destination it should return to. Dropping
 * them would land the visitor on a bare company page with no memory of why they
 * were sent anywhere, which is the same dead end wearing a different URL.
 *
 * ⚠ NOTHING HERE CREATES A PROFILE. That is deliberately out of scope.
 */
export function NoProfileYet({
  /** "buyer" or "requester" — the path they were trying to start. */
  path,
  /** The `?blocked=` reason, if they arrived from the transact gate. */
  blocked,
  /** The `?from=` door they were originally trying to open. */
  from,
}: {
  path: "buyer" | "requester";
  blocked?: string | null;
  from?: string | null;
}) {
  const qs = new URLSearchParams();
  if (blocked) qs.set("blocked", blocked);
  if (from) qs.set("from", from);
  const companyHref = qs.toString() ? `/company?${qs}` : "/company";

  return (
    <div className="grid min-h-screen place-items-center bg-white px-6 font-body text-ink">
      <div className="w-full max-w-md text-center">
        {/*
          ⚠ TEMPLATE LITERALS, NOT JSX TEXT WITH `{path}` INLINE MID-SENTENCE.

          Written the obvious way — `nothing on the {path} path has been set up` —
          JSX swallowed the space after the expression and this shipped as
          "nothing on the buyerpath". It was invisible reading the source and
          obvious in a screenshot. One string per sentence, one space inside it,
          and no JSX whitespace rule to lose an argument with.
        */}
        <h1 className="text-2xl font-extrabold">
          {`This account has no ${path} profile yet`}
        </h1>
        <p className="mt-3 text-ink-2">
          {`You’re signed in, but nothing on the ${path} path has been set up for ` +
            `this account. Setting up your company is the first step either way — ` +
            `start there and we’ll pick up from what you already have.`}
        </p>
        <div className="mt-6 flex flex-col items-center gap-3">
          <Link
            href={companyHref}
            className="rounded-[12px] bg-magenta px-7 py-3 font-display text-[15px] font-bold text-white"
          >
            Set up your company →
          </Link>
          <Link href="/dashboard" className="text-[14px] font-bold text-ink-2 hover:text-ink">
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * The `?blocked=` / `?from=` pair, read from the URL AFTER MOUNT.
 *
 * ⚠ `window.location.search`, NOT `useSearchParams()`, AND THAT IS ON PURPOSE.
 * `/join/buyer` and `/join/requester` both prerender as `○`. `useSearchParams()`
 * in a client component forces the whole route dynamic unless it is wrapped in a
 * `<Suspense>` boundary, and neither page has one — adding one to move two static
 * pages to `ƒ` for a value that is only read after mount is a worse trade than
 * reading the location directly. Both callers already do their work in an
 * effect, so there is no server render to disagree with.
 */
export function readBlockedParams(): { blocked: string | null; from: string | null } {
  if (typeof window === "undefined") return { blocked: null, from: null };
  const q = new URLSearchParams(window.location.search);
  return { blocked: q.get("blocked"), from: q.get("from") };
}
