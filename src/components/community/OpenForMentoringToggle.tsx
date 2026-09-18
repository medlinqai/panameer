"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * ── ⚠⚠ THE CHECKBOX IS THE CONSENT (`P2-J3-E558` WS-C1) ───────────────────
 *
 * ⚠ Scott, 2026-09-18: colleague is lateral and free; MENTOR IS COMMERCIAL. A
 * provider declares themselves open ONCE, here. Being followed as a mentor
 * afterwards is DEMAND, not an unconsented claim about the person — which is
 * why `ConnectionKind.MENTOR` needs no PENDING state and none was added.
 *
 * ⚠⚠⚠ THE COPY PROMISES NO SESSION, NO BOOKING AND NO PAYMENT. No processor is
 * chosen and `MICRO_SESSION_PRICE` is commented out (`mentors.ts:141`). The
 * honest end of the flow today is *follow as a mentor* → the mentor sees demand.
 * ⚠ The public Learn page already sells "Book a 1:1" with a price the database
 * cannot honour. DO NOT ADD A SECOND SUCH PROMISE.
 *
 * ⚠ OPTIMISTIC WITH A REVERT, the contract the availability toggle already uses.
 */
export function OpenForMentoringToggle({ initial }: { initial: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/provider/mentoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ open: next }),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        setOpen(!next); /* ⚠ revert */
        setError(body.error ?? "That didn't save.");
        return;
      }
      router.refresh();
    } catch {
      setOpen(!next);
      setError("That didn't save.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-brand border border-line bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-[200px] flex-1">
          <p className="text-[15px] font-bold">Open for mentoring</p>
          {/* ⚠⚠ SAYS EXACTLY WHAT TURNING IT ON DOES, AND NOTHING MORE. It makes
              you findable. It does not schedule anything, charge anything, or
              commit you to anything. */}
          <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">
            Let people looking for a mentor find you. Nothing is scheduled and
            nothing is charged — people who are interested follow you, and you
            see who they are.
          </p>
        </div>
        <button
          type="button"
          onClick={toggle}
          disabled={busy}
          aria-pressed={open}
          className={
            "shrink-0 rounded-full border-[1.5px] px-5 py-2 text-[13.5px] font-bold transition-colors disabled:opacity-50 " +
            (open
              ? "border-magenta bg-magenta text-white hover:bg-magenta-dark"
              : "border-line text-ink hover:border-magenta hover:text-magenta")
          }
        >
          {busy ? "…" : open ? "You're open" : "Turn on"}
        </button>
      </div>
      {error && <p className="mt-2 text-[13px] font-semibold text-red-700">{error}</p>}
    </div>
  );
}
