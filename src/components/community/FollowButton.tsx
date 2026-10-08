"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Follow / Following (click again to unfollow) + the follower count. One-way, no approval.
export function FollowButton({ toUserId, initialFollowing, initialCount }: { toUserId: string; initialFollowing: boolean; initialCount: number }) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const toggle = async () => {
    const next = !following;
    setFollowing(next);
    setCount((c) => c + (next ? 1 : -1));
    setBusy(true);
    setErr(null);
    const r = await fetch("/api/community/connections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: next ? "follow" : "unfollow", toUserId }) }).catch(() => null);
    setBusy(false);
    if (!r?.ok) {
      setFollowing(!next);
      setCount((c) => c + (next ? -1 : 1));
      setErr("That didn't go through.");
      return;
    }
    router.refresh();
  };
  return (
    <div data-follow>
      <button type="button" aria-pressed={following} disabled={busy} onClick={toggle} className={"flex min-h-[44px] w-full items-center justify-center border border-ink text-[14px] font-semibold " + (following ? "bg-ink text-surface" : "bg-surface text-ink hover:bg-black/[0.04]")}>
        {following ? "Following" : "Follow"}
      </button>
      <p className="mt-2 text-[12px] text-ink-2">
        {count} {count === 1 ? "follower" : "followers"}
        {following ? " · click again to unfollow" : ""}
      </p>
      {err && <p className="text-[12px] text-red-600">{err}</p>}
    </div>
  );
}
