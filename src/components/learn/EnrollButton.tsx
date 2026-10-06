"use client";

import { useRouter } from "next/navigation";
import { LEARN_ENROLL_CTA } from "@/lib/learn-steps";
import { useState } from "react";
import { AccountPitch } from "@/components/learn/AccountPitch";
import { GateNotice, type GateNoticeGap } from "@/components/GateNotice";

export function EnrollButton({
  pathId,
  slug,
  enrolled,
  signedIn,
  learnGaps = [],
  notReady = false,
}: {
  pathId: string;
  slug: string;
  enrolled: boolean;
  signedIn: boolean;
  notReady?: boolean;
  learnGaps?: GateNoticeGap[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const blocked = !enrolled && learnGaps.length > 0;

  if (notReady) {
    return (
      <div>
        <button
          type="button"
          disabled
          className="w-full cursor-not-allowed border border-white/25 bg-white/10 px-4 py-2.5 text-[13px] font-bold text-white/55"
        >
          Enroll Now
        </button>
        {}
        <p className="mt-2.5 text-[10.5px] leading-relaxed text-white/60">
          There are no videos in this path yet, so there is nothing to start. The
          outline below is real, and enrolling opens when the first lesson does.
        </p>
      </div>
    );
  }

  if (!signedIn) {
    return <AccountPitch callbackUrl={`/learn/${slug}`} cta={LEARN_ENROLL_CTA} />;
  }

  const toggle = async () => {
    setBusy(true);
    setError(null);
    try {
      // THE ONLY PLACE THIS URL IS FETCHED FROM, AND IT MOVED WITH THE
      const r = await fetch("/api/learn/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pathId, enroll: !enrolled }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(body.error ?? "That didn't work.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="inline-flex flex-col">
      {/* THE REASON IS SHOWN BEFORE THE BLOCK, NOT AFTER THE CLICK */}
      {blocked && (
        <GateNotice
          className="mb-3 max-w-md"
          heading="Add a couple of things and you're in"
          lede="It's still free. Browsing and watching stay open either way — this is only about enrolling."
          gaps={learnGaps}
        />
      )}
      <button
        type="button"
        onClick={toggle}
        disabled={busy || blocked}
        className={
          "px-6 py-2.5 text-[14.5px] font-bold transition-colors disabled:opacity-50 " +
          (enrolled
            ? "border-[1.5px] border-line text-ink-2 hover:border-magenta hover:text-magenta"
            : "bg-magenta text-white hover:bg-magenta-dark")
        }
      >
        {busy ? "…" : enrolled ? "Enrolled ✓" : LEARN_ENROLL_CTA}
      </button>
      {error && <span className="mt-1 text-[12.5px] text-red-700">{error}</span>}
    </span>
  );
}
