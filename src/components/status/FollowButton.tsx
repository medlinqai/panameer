"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function FollowButton({
  signedIn,
  initiallyFollowing,
  variant = "onInk",
  testId,
  initiallyWeekly = false,
}: {
  signedIn: boolean;
  initiallyFollowing: boolean;
  variant?: "onInk" | "onSurface";
  testId?: string;
  /** Whether this follower has already asked for the weekly email. */
  initiallyWeekly?: boolean;
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(initiallyFollowing);
  const [pending, start] = useTransition();
  const [weekly, setWeekly] = useState(initiallyWeekly);

  const cls =
    "inline-flex min-h-[48px] items-center rounded-[4px] px-6 text-[15px] font-bold transition-opacity disabled:opacity-50 " +
    (variant === "onInk"
      ? "bg-[#fff] text-rail hover:opacity-85"
      : "border border-ink bg-surface text-ink hover:bg-ink/5");

  const button = (
    <button
      type="button"
      data-testid={testId}
      disabled={pending}
      className={cls}
      onClick={async () => {
        if (!signedIn) {
          router.push("/join?next=/status&follow=1");
          return;
        }
        const next = !following;
        const res = await fetch("/api/status/follow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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

  if (!following) return button;

  return (
    <span className="inline-flex flex-col items-start gap-2">
      {button}
      <label className="flex min-h-11 cursor-pointer items-center gap-2 text-[13px]">
        <input
          type="checkbox"
          checked={weekly}
          disabled={pending}
          onChange={async (e) => {
            const want = e.target.checked;
            setWeekly(want);
            const res = await fetch("/api/status/follow", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ following: true, weeklyEmail: want }),
            });
            if (!res.ok) setWeekly(!want);
            else start(() => router.refresh());
          }}
        />
        <span className={variant === "onInk" ? "text-[#fff]" : "text-ink-2"}>
          Email me the weekly update
        </span>
      </label>
    </span>
  );
}
