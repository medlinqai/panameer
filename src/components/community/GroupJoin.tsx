"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * ── ⚠⚠⚠ THE JOIN / LEAVE CONTROL (`P2-A3-E612` WS-B) ────────────────────
 *
 * ⚠⚠ `E579` — A PAGE MUST NOT RENDER A CONTROL THAT CANNOT WORK. Each branch
 * below either offers something that works or says a true sentence instead.
 * There is no disabled Join on an invite-only group, because there is nothing
 * to explain about a door that was never there.
 *
 * ⚠⚠⚠ A PRICED GROUP SHOWS ITS PRICE AND OFFERS NO PURCHASE. The line NAMES THE
 * MECHANISM, never the member — *"buying isn't switched on yet"*, never *"you
 * are not eligible"*. ⚠ No `Payment` row is ever created anywhere in the
 * codebase and `PAID` is never written, so a *"Join for $X"* button would
 * promise a mechanism with no writer, which is the rule that dashed Earnings at
 * `E603`.
 *
 * ⚠⚠ AND A PATH GROUP HAS NO LEAVE CONTROL. Scott, 2026-09-23: *"You cannot
 * leave a path group. You unenrol from the path. One door, not two."*
 */
export type GroupOfferView =
  | { kind: "join" }
  | { kind: "request" }
  | { kind: "invite_only" }
  | { kind: "priced"; priceCents: number; period: string | null }
  | { kind: "by_enrolment" }
  | { kind: "member" };

const money = (cents: number) =>
  `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0 })}`;

export function GroupJoin({
  boardId,
  offer,
  copy,
  canLeave,
  pathSlug,
}: {
  boardId: string;
  offer: GroupOfferView;
  copy: string;
  canLeave: boolean;
  pathSlug: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const post = async (action: "join" | "leave") => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/community/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardId, action }),
      });
      const data = (await r.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;
      if (!r.ok || !data?.ok) {
        setError(data?.error ?? "That didn't work. Try again.");
        return;
      }
      router.refresh();
    } catch {
      /* ⚠ A thrown fetch must not produce silence (`E516`). */
      setError("That didn't work. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const btn =
    "inline-flex w-fit items-center gap-2 rounded-full px-5 py-2.5 text-[13.5px] font-bold transition-colors disabled:opacity-50";

  return (
    <div>
      {offer.kind === "priced" && (
        /* ⚠⚠ STORE THE PRICE, SHOW THE PRICE, OFFER NO PURCHASE. */
        <p className="mb-1.5 text-[15px] font-bold">
          {money(offer.priceCents)}
          {offer.period ? ` / ${offer.period}` : ""}
        </p>
      )}

      <p className="text-[13px] leading-relaxed text-ink-2">{copy}</p>

      {offer.kind === "join" && (
        <button
          type="button"
          onClick={() => post("join")}
          disabled={busy}
          className={btn + " mt-3 bg-magenta text-white hover:bg-magenta-dark"}
        >
          {busy ? "Joining…" : "Join This Group"}
        </button>
      )}

      {offer.kind === "request" && (
        <button
          type="button"
          onClick={() => post("join")}
          disabled={busy}
          className={
            btn + " mt-3 border border-magenta text-magenta hover:bg-magenta hover:text-white"
          }
        >
          {busy ? "Sending…" : "Ask to Join"}
        </button>
      )}

      {/* ⚠⚠⚠ `invite_only` AND `priced` RENDER **NO CONTROL AT ALL**. The
          sentence above is the whole affordance, because there is nothing a
          non-member can do here and a disabled button would imply there is. */}

      {offer.kind === "by_enrolment" && pathSlug && (
        /* ⚠ ONE DOOR: it points at the path, which is the only way in. */
        <a
          href={`/learn/${pathSlug}`}
          className={
            btn + " mt-3 border border-magenta text-magenta hover:bg-magenta hover:text-white"
          }
        >
          Go to the Path
        </a>
      )}

      {offer.kind === "member" && canLeave && (
        <button
          type="button"
          onClick={() => post("leave")}
          disabled={busy}
          className={btn + " mt-3 border border-line text-ink-2 hover:border-magenta hover:text-magenta"}
        >
          {busy ? "Leaving…" : "Leave This Group"}
        </button>
      )}

      {offer.kind === "member" && !canLeave && pathSlug && (
        /* ⚠⚠ NOT A DISABLED LEAVE BUTTON. There is no second door to explain —
           unenrolling is the action, and it lives on the path. */
        <p className="mt-2 text-[12.5px] leading-relaxed text-ink-2">
          You&apos;re here because you enrolled. Unenrol from{" "}
          <a href={`/learn/${pathSlug}`} className="font-semibold text-magenta underline">
            the path
          </a>{" "}
          to leave.
        </p>
      )}

      {error && <p className="mt-2 text-[12.5px] text-red-600">{error}</p>}
    </div>
  );
}
