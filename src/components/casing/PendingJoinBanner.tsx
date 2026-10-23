"use client";

import { useState } from "react";
import Link from "next/link";
import { useMe } from "@/components/MeProvider";
import "@/components/notifications/triage.css";

const KEY = "pm-pending-join-banner-dismissed";
const dismissedNow = () => {
  try { return typeof window !== "undefined" && sessionStorage.getItem(KEY) === "1"; } catch { return false; }
};

// PB-E003: one calm line while a buyer waits to join their company — dismissible for the session.
export function PendingJoinBanner() {
  const { me } = useMe();
  const [hidden, setHidden] = useState(dismissedNow);
  const p = me?.pendingJoin;
  if (!p || hidden || !me?.person?.roles?.isServiceBuyer) return null;
  return (
    <div className="pm-hidden-banner" role="status" data-pending-join-banner>
      <p>
        You&apos;re waiting to join <strong>{p.company}</strong>.{" "}
        <span className="pm-hidden-banner-why">Keep shopping and building your cart — only checking out waits.</span>
      </p>
      <Link href="/support/help" className="pm-hidden-banner-act">Message Support</Link>
      <button type="button" aria-label="Dismiss" onClick={() => { try { sessionStorage.setItem(KEY, "1"); } catch {} setHidden(true); }} className="pm-hidden-banner-act">✕</button>
    </div>
  );
}
