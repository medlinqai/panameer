"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * The free-enrolment CTA (WS2 design ref; the convert-to-account path is WS4).
 *
 * A logged-out visitor is sent to sign-up with a callback back to THIS path, so
 * enrolling never costs them their place. That is the convert-to-account
 * trigger the brief asks for: the enrol button is the moment someone has
 * decided they want something, which is the only moment worth asking them to
 * make an account.
 */
export function EnrolButton({
  pathId,
  slug,
  enrolled,
  signedIn,
}: {
  pathId: string;
  slug: string;
  enrolled: boolean;
  signedIn: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!signedIn) {
    /*
      CONVERT TO ACCOUNT, returning to THIS path (WS4).

      Sent to /login rather than /join, deliberately. /join is the marketplace
      onboarding fork — pick Buyer or Provider, then a ten-step wizard — and a
      learner who clicked Enrol on a free course has said nothing about wanting
      to sell or buy consulting. Making them answer that to watch a video is
      both a conversion killer and a question we have no right to ask yet.

      /login already honours callbackUrl and routes on to sign-up for people
      without an account, so this returns them here either way. If Learn ever
      needs its own lightweight sign-up, THIS is the link that should change —
      one place, not every enrol button.
    */
    const back = encodeURIComponent(`/learn/${slug}`);
    return (
      <span className="inline-flex flex-col">
        <a
          href={`/login?callbackUrl=${back}`}
          className="rounded-full bg-magenta px-6 py-2.5 text-[14.5px] font-bold text-white transition-colors hover:bg-magenta-dark"
        >
          Enrol Free
        </a>
        <span className="mt-1 text-[12.5px] text-ink-2">
          Free — we&apos;ll bring you straight back here.
        </span>
      </span>
    );
  }

  const toggle = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/learn/enrol", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pathId, enrol: !enrolled }),
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
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        className={
          "rounded-full px-6 py-2.5 text-[14.5px] font-bold transition-colors disabled:opacity-50 " +
          (enrolled
            ? "border-[1.5px] border-line text-ink-2 hover:border-magenta hover:text-magenta"
            : "bg-magenta text-white hover:bg-magenta-dark")
        }
      >
        {busy ? "…" : enrolled ? "Enrolled ✓" : "Enrol Free"}
      </button>
      {error && <span className="mt-1 text-[12.5px] text-red-700">{error}</span>}
    </span>
  );
}
