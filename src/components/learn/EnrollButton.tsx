"use client";

import { useRouter } from "next/navigation";
import { LEARN_ENROLL_CTA } from "@/lib/learn-steps";
import { useState } from "react";
import { AccountPitch } from "@/components/learn/AccountPitch";
import { GateNotice, type GateNoticeGap } from "@/components/GateNotice";

/**
 * The free-enrollment CTA (WS2 design ref; the convert-to-account path is WS4).
 *
 * A logged-out visitor is sent to sign-up with a callback back to THIS path, so
 * enrolling never costs them their place. That is the convert-to-account
 * trigger the brief asks for: the enroll button is the moment someone has
 * decided they want something, which is the only moment worth asking them to
 * make an account.
 */
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
  /**
   * ── ⚠⚠⚠ THE PATH HAS NO PLAYABLE LESSON (`P2-A4-E611`, Q4) ──────────────
   *
   * ⚠⚠ SCOTT, 2026-09-23: *"keep Enroll disabled with a reason. A rendered
   * control whose handler refuses is worse than no control — a disabled button
   * that says why teaches; a hidden one looks broken."*
   *
   * ⚠ MEASURED 2026-09-23 at 390px: an unready path rendered a live **Enroll
   * Now**, and `api/learn/enroll` refused it with `PATH_NOT_READY`. A door onto
   * a wall (`E579`).
   * ⚠⚠ THIS IS NOT THE BOUNDARY. The route refuses regardless — this only stops
   * the page promising something the server will decline.
   */
  notReady?: boolean;
  /**
   * ⚠ THE `LEARN` GATE, MIRRORED (`P1-ALL-E034`). Computed on the server by the
   * same function the route refuses with. ⚠ NOT THE BOUNDARY — the route refuses
   * regardless of what this renders.
   */
  learnGaps?: GateNoticeGap[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /* ⚠ Already ENROLLED is never blocked. The gate is on joining, and someone who
     joined before the bar existed must still be able to LEAVE. */
  const blocked = !enrolled && learnGaps.length > 0;

  /*
    ⚠⚠ THE REFUSAL IS SHOWN BEFORE THE SIGNED-OUT PITCH, AND THAT ORDER IS THE
    POINT: a signed-out visitor must not be sold an account in order to join a
    path nobody can start. ⚠ The outline below it still renders — reading is
    never gated (`E362`).
  */
  if (notReady) {
    return (
      <div>
        <button
          type="button"
          disabled
          className="w-full cursor-not-allowed rounded-[11px] border border-white/25 bg-white/10 px-4 py-2.5 text-[13px] font-bold text-white/55"
        >
          Enroll Now
        </button>
        {/* ⚠ IT NAMES THE MECHANISM, NEVER THE MEMBER. Nothing here says "you
            cannot" — the path has no videos, which is a fact about the path. */}
        <p className="mt-2.5 text-[10.5px] leading-relaxed text-white/60">
          There are no videos in this path yet, so there is nothing to start. The
          outline below is real, and enrolling opens when the first lesson does.
        </p>
      </div>
    );
  }

  if (!signedIn) {
    /*
      CONVERT TO ACCOUNT, returning to THIS path (WS4 → D2 / E016.7).

      Sent to /login rather than /join, deliberately. /join is the marketplace
      onboarding fork — pick Buyer or Provider, then a ten-step wizard — and a
      learner who clicked Enroll on a free course has said nothing about wanting
      to sell or buy consulting. Making them answer that to watch a video is
      both a conversion killer and a question we have no right to ask yet.

      /login already honours callbackUrl and routes on to sign-up for people
      without an account, so this returns them here either way.

      D2 — IT SELLS THE ACCOUNT, IT DOESN'T JUST BLOCK. What was here was a
      magenta "Enroll Now" and the words "we'll bring you straight back here",
      which answers "will this cost me my place" and never answers "why do you
      need me at all". <AccountPitch> is the answer: certifications are awarded
      against a profile, so an account is the thing that makes the free course
      leave a mark. Same component on the lesson page, so the promise is made
      once.
    */
    return <AccountPitch callbackUrl={`/learn/${slug}`} cta={LEARN_ENROLL_CTA} />;
  }

  const toggle = async () => {
    setBusy(true);
    setError(null);
    try {
      /*
        ⚠⚠ THE ONLY PLACE THIS URL IS FETCHED FROM, AND IT MOVED WITH THE
        DIRECTORY (`P1-J3-E039`, 2026-08-27). `api/learn/enrol` -> `api/learn/enroll`.
        ⚠ A ROUTE PATH IS A LIVE URL — the rename and this string had to change in
        ONE commit or enrollment 404s. Verified end to end signed in.
      */
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
      {/*
        ⚠⚠ THE REASON IS SHOWN BEFORE THE BLOCK, NOT AFTER THE CLICK
        (`P1-ALL-E034`). Learning what you owe by being refused is the worst
        version of this, and the page already knows.
        ⚠ THE BUTTON STAYS VISIBLE AND DISABLED — never hidden, never
        `pointer-events: none`, so the explanation and its links are reachable by
        keyboard (the `E306` rule).
      */}
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
          "rounded-full px-6 py-2.5 text-[14.5px] font-bold transition-colors disabled:opacity-50 " +
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
