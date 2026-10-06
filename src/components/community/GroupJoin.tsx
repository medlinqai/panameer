"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
      /* A thrown fetch must not produce silence (`E516`). */
      setError("That didn't work. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const btn =
    "inline-flex w-fit items-center gap-2 px-5 py-2.5 text-[13.5px] font-semibold transition-colors disabled:opacity-50";

  return (
    <div>
      {offer.kind === "priced" && (
        /* STORE THE PRICE, SHOW THE PRICE, OFFER NO PURCHASE. */
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
          className={btn + " mt-3 bg-ink text-surface hover:bg-ink-hover"}
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
            btn + " mt-3 border border-ink bg-surface text-ink hover:bg-surface-hover"
          }
        >
          {busy ? "Sending…" : "Ask to Join"}
        </button>
      )}

      {/* sentence above is the whole affordance, because there is nothing a */}

      {offer.kind === "by_enrolment" && pathSlug && (
        /* ONE DOOR: it points at the path, which is the only way in. */
        <a
          href={`/learn/${pathSlug}`}
          className={
            btn + " mt-3 border border-ink bg-surface text-ink hover:bg-surface-hover"
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
          className={btn + " mt-3 border border-ink bg-surface text-ink hover:bg-surface-hover"}
        >
          {busy ? "Leaving…" : "Leave This Group"}
        </button>
      )}

      {offer.kind === "member" && !canLeave && pathSlug && (
        // NOT A DISABLED LEAVE BUTTON. There is no second door to explain —
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
