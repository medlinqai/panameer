"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

/**
 * ⚠⚠ FOLLOW THE BUILD (`P2-ALL-E758`).
 *
 * ⚠ Signed in → one click, and the label becomes `Following ✓`. Signed out →
 * `/join?next=/status&follow=1`, and the intent is applied after sign-up.
 * ⚠⚠ `Follow the Build` names an action and is Title Case (load-bearing rule 11);
 * `Following ✓` reports a STATE, so it is not.
 */
export function FollowButton({
  signedIn,
  initiallyFollowing,
  variant = "onInk",
  testId,
}: {
  signedIn: boolean;
  initiallyFollowing: boolean;
  variant?: "onInk" | "onSurface";
  /** ⚠ `data-testid` IS DELIBERATE, NOT DEBRIS. The page renders TWO of these
   *  (hero and close band) and the label CHANGES when clicked, so a role+name
   *  locator both matches two nodes and stops matching after the first click —
   *  it churned across `router.refresh()` and the test failed for a reason that
   *  had nothing to do with the code. Same reasoning as `PageTabs`' own testid. */
  testId?: string;
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(initiallyFollowing);
  const [pending, start] = useTransition();

  const cls =
    "inline-flex min-h-[48px] items-center rounded-[4px] px-6 text-[15px] font-bold transition-opacity disabled:opacity-50 " +
    (variant === "onInk"
      /* ⚠⚠ PINNED (Scott, 2026-10-02): the `onInk` variant sits on `/status`'s two
         bands, which no longer invert. `bg-surface`/`text-ink` would put a
         near-black button on a near-black band in dark mode. ⚠ `bg-white` is not
         usable — `globals.css` overrides `.bg-white` in dark — so the arbitrary
         value is deliberate, and `text-rail` is the pinned token. */
      ? "bg-[#fff] text-rail hover:opacity-85"
      : "border border-ink bg-surface text-ink hover:bg-ink/5");

  return (
    <button
      type="button"
      data-testid={testId}
      disabled={pending}
      className={cls}
      onClick={async () => {
        if (!signedIn) {
          /* ⚠ The intent travels in the URL, so it survives sign-up, sign-in and
             whichever join sub-journey the person picks. */
          router.push("/join?next=/status&follow=1");
          return;
        }
        const next = !following;
        const res = await fetch("/api/status/follow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          /* ⚠ The desired STATE, not a toggle — a toggle double-fires on a slow
             connection and leaves the member in the state they did not pick. */
          body: JSON.stringify({ following: next }),
        });
        if (res.ok) {
          const j = (await res.json()) as { following?: boolean };
          setFollowing(j.following === true);
          start(() => router.refresh());
        }
      }}
    >
      {following ? "Following ✓" : "Follow the Build"}
    </button>
  );
}
