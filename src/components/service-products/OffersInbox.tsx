"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, TextInput, TextArea, Notice } from "@/components/onboarding/controls";
import { formatCents } from "@/lib/display";

export type OpenOffer = {
  id: string;
  offerNumber: string;
  productTitle: string;
  listPriceCents: number | null;
  amountCents: number;
  currency: string;
  clearedFloorCents: number | null;
  createdAt: string;
};

export function OffersInbox({ offers }: { offers: OpenOffer[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [denying, setDenying] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [floor, setFloor] = useState("");

  async function send(body: Record<string, unknown>, offerId: string, said: string) {
    setBusy(offerId);
    setError(null);
    setDone(null);
    try {
      const res = await fetch("/api/provider/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setError((await res.json().catch(() => null))?.error ?? "That didn't go through.");
        return;
      }
      setDone(said);
      setDenying(null);
      setMessage("");
      setFloor("");
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  if (offers.length === 0) {
    return (
      <p className="mt-6 text-[15px] leading-relaxed text-ink-2">
        No open offers. Buyers can only make one on a <strong className="text-ink">published</strong>{" "}
        service product — publish one and this is where their offers arrive.
      </p>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      {error && <Notice tone="error">{error}</Notice>}
      {}
      {done && <Notice tone="info">{done}</Notice>}

      {offers.map((o) => {
        const under =
          o.listPriceCents != null && o.amountCents < o.listPriceCents
            ? o.listPriceCents - o.amountCents
            : null;
        return (
          <section key={o.id} className="rounded-brand border border-line bg-white p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[17px] font-bold text-ink">{o.productTitle}</h2>
              <span className="text-[13px] text-ink-2">{o.offerNumber}</span>
            </div>

            <p className="mt-1.5 text-[15px] text-ink">
              Offered <strong>{formatCents(o.amountCents, o.currency)}</strong>
              {o.listPriceCents != null && (
                <>
                  {" "}
                  against a list price of {formatCents(o.listPriceCents, o.currency)}
                  {}
                  {under != null && (
                    <> — {formatCents(under, o.currency)} below</>
                  )}
                </>
              )}
              .
            </p>
            {}
            {o.clearedFloorCents != null && (
              <p className="mt-1 text-[13.5px] text-ink-2">
                This cleared the {formatCents(o.clearedFloorCents, o.currency)} minimum you
                gave last time. ⚠ You can still decline it.
              </p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={busy === o.id}
                onClick={() =>
                  send({ action: "accept", offerId: o.id }, o.id, "Offer accepted. It is on the buyer's cart at the offered amount.")
                }
                className="min-h-11 bg-magenta px-5 text-[14.5px] font-bold text-white hover:opacity-90 disabled:opacity-50"
              >
                Accept Offer
              </button>
              <button
                type="button"
                disabled={busy === o.id}
                onClick={() => setDenying(denying === o.id ? null : o.id)}
                className="min-h-11 border-[1.5px] border-line px-5 text-[14.5px] font-bold text-ink hover:border-magenta hover:text-magenta disabled:opacity-50"
              >
                Decline
              </button>
            </div>

            {denying === o.id && (
              <div className="mt-3 border-t border-line pt-3">
                <Field label="A message, if you want to give one (optional)">
                  <TextArea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={2}
                    placeholder="e.g. I can't go that low on this one."
                  />
                </Field>
                <div className="mt-2 max-w-[260px]">
                  <Field label="Lowest you would consider, in dollars (optional)">
                    <TextInput
                      value={floor}
                      onChange={(e) => setFloor(e.target.value)}
                      inputMode="decimal"
                      placeholder="1000"
                    />
                  </Field>
                </div>
                {}
                <p className="mt-2 text-[13.5px] text-ink-2">
                  ⚠ A minimum is <strong className="text-ink">guidance, not a quote</strong>.
                  The buyer&apos;s next offer must clear it, and you can still decline that
                  one too.
                </p>
                <button
                  type="button"
                  disabled={busy === o.id}
                  onClick={() => {
                    const dollars = floor.trim();
                    let floorCents: number | null = null;
                    if (dollars) {
                      const n = Number(dollars);
                      if (!Number.isFinite(n) || n <= 0) {
                        setError("A minimum must be an amount above zero.");
                        return;
                      }
                      floorCents = Math.round(n * 100);
                    }
                    send(
                      {
                        action: "deny",
                        offerId: o.id,
                        message: message.trim() || null,
                        floorCents,
                      },
                      o.id,
                      "Offer declined. The buyer can buy at list, offer again above your minimum, or walk away."
                    );
                  }}
                  className="mt-3 min-h-11 bg-ink px-5 text-[14.5px] font-bold text-white hover:opacity-90 disabled:opacity-50"
                >
                  Send Decline
                </button>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
