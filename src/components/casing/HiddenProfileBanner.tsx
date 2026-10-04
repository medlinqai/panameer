"use client";

import Link from "next/link";
import { useMe } from "@/components/MeProvider";
import "@/components/notifications/triage.css";

export function HiddenProfileBanner() {
  const { me, loading } = useMe();
  if (loading) return null;
  const p = me?.providerProfile;

  if (!p) return null;
  if (!p.published) return null;
  if (p.visible) return null;

  return (
    <div className="pm-hidden-banner" role="status">
      <p>
        <strong>Your profile is hidden from buyers.</strong>{" "}
        <span className="pm-hidden-banner-why">
          {}
          {p.paused
            ? "You switched it off."
            : "Some required details are still missing."}
        </span>
      </p>
      <Link href="/profile" className="pm-hidden-banner-act">
        {p.paused ? "Turn Visibility On" : "Fix This"}
      </Link>
    </div>
  );
}
