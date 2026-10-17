"use client";

import Link from "next/link";
import { useMe } from "@/components/MeProvider";
import { MissingList, useVisibleSwitch } from "@/components/profile/VisibleSwitch";
import "@/components/notifications/triage.css";

export function HiddenProfileBanner() {
  const { me, loading } = useMe();
  const sw = useVisibleSwitch();
  if (loading) return null;
  const p = me?.providerProfile;

  if (!p) return null;
  if (!p.published) return null;
  if (p.visible) return null;

  // VR-E002: name exactly what's missing, each linking to its fix.
  if (!p.paused) {
    if (!p.missing?.length) return null;
    return (
      <div className="pm-hidden-banner" role="status" data-hidden-missing>
        <p>
          <strong>Your profile is hidden from buyers — missing:</strong>{" "}
          {p.missing.map((m, i) => (
            <span key={m.key}>
              {i > 0 && " · "}
              <Link href={m.href} className="font-semibold underline underline-offset-4">{m.label}</Link>
            </span>
          ))}
        </p>
      </div>
    );
  }

  return (
    <div className="pm-hidden-banner" role="status">
      <p>
        <strong>Your profile is hidden from buyers.</strong>{" "}
        <span className="pm-hidden-banner-why">You switched it off</span>
      </p>
      <button type="button" disabled={sw.busy} onClick={() => void sw.set(true)} className="pm-hidden-banner-act" data-turn-visibility-on>Turn Visibility On</button>
      <MissingList missing={sw.missing} />
    </div>
  );
}
