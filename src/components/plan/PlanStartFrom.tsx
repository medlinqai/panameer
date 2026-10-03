"use client";

/**
 * ── START FROM — BLANK · TEMPLATE · COPY (`P2-ALL-E784`) ────────────────────
 *
 * ⚠⚠ **IT ONLY OFFERS WHAT IT CAN DO.** The template and copy actions REFUSE a
 * plan that already has rows (`store.ts`/`template.ts`), so when the plan is
 * non-empty this renders the clearing path instead of buttons that would come
 * back with an error. ⚠ A control that is certain to fail is worse than no
 * control — and a control that silently merged would be unrecoverable by hand.
 *
 * ⚠ Import (Excel / CSV) is NOT here yet: it lands in its own lane. A button
 * that goes nowhere is a dead end (`E608`), so there isn't one.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";

const BTN = "inline-flex min-h-11 items-center rounded-[4px] bg-ink px-3 text-[13px] font-bold text-surface transition-opacity hover:opacity-85 disabled:opacity-40";
const BTN_2 = "inline-flex min-h-11 items-center rounded-[4px] border border-ink bg-surface px-3 text-[13px] font-bold text-ink transition-colors hover:bg-ink/5 disabled:opacity-40";

export function PlanStartFrom({
  ownerKey,
  hasRows,
  endpoint = "/api/admin/plan",
}: {
  ownerKey: string;
  hasRows: boolean;
  endpoint?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** ⚠⚠ Clearing a plan is confirmed IN PAGE, in two steps. There is no undo for
   *  it — `deleteRow`'s buffer holds one row and its children, not a whole plan
   *  — so the second click is the only thing standing between Scott and his own
   *  work. ⚠ Saying that plainly is part of the control. */
  const [confirmClear, setConfirmClear] = useState(false);

  async function run(action: string, extra: Record<string, unknown> = {}) {
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerKey, action, ...extra }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "That didn’t work.");
        return;
      }
      setConfirmClear(false);
      router.refresh();
    } catch {
      setError("Couldn’t reach the server.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="border border-line bg-bg-soft p-4">
      <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink-2">Start from</p>
      {hasRows ? (
        <>
          <p className="mt-2 max-w-[70ch] text-[14px] leading-relaxed text-ink-2">
            This plan already has rows, so the template and copy options are off — they would
            either merge into your work or replace it. Clear the plan first if you want to start
            again.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {confirmClear ? (
              <>
                <span className="text-[13px] font-bold text-magenta">
                  Delete every row in this plan? There is no undo for this.
                </span>
                <button type="button" className={BTN} disabled={busy !== null} onClick={() => void run("clear")}>
                  {busy === "clear" ? "Clearing…" : "Yes, Clear the Plan"}
                </button>
                <button type="button" className={BTN_2} onClick={() => setConfirmClear(false)}>
                  Keep It
                </button>
              </>
            ) : (
              <button type="button" className={BTN_2} onClick={() => setConfirmClear(true)}>
                Clear the Plan
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          <p className="mt-2 max-w-[70ch] text-[14px] leading-relaxed text-ink-2">
            Type your own rows below, or start from the Panameer template — seven phases, the ten
            journeys under Build, and the dates already in the tracker. Everything in it is yours to
            edit or delete.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className={BTN} disabled={busy !== null} onClick={() => void run("template")}>
              {busy === "template" ? "Building…" : "Use the Panameer Template"}
            </button>
          </div>
        </>
      )}
      {error && <p className="mt-3 text-[13px] font-bold text-magenta">{error}</p>}
    </div>
  );
}
