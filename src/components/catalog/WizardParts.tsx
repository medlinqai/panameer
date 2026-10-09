"use client";

import Link from "next/link";

// Shared pieces of the My Catalog create flows (services, service products, cost estimates).
export const INPUT = "mt-1 h-11 w-full border border-line bg-surface px-3 text-[14px] font-normal focus:border-ink focus:outline-none";
export const AREA = "mt-1 w-full border border-line bg-surface px-3 py-2 text-[14px] font-normal focus:border-ink focus:outline-none";
export const LABEL = "block text-[12.5px] font-bold";
export const BTN = "inline-flex min-h-11 items-center justify-center border border-ink bg-surface px-5 text-[14px] font-semibold text-ink hover:bg-surface-hover disabled:opacity-40";
export const BTN_K = "inline-flex min-h-11 items-center justify-center bg-ink px-5 text-[14px] font-semibold text-surface hover:bg-ink-hover disabled:opacity-40";

/** Numbered steps: ink ✓ done, magenta current, #C9CDDC ahead. */
export function Steps({ labels, at, onPick }: { labels: string[]; at: number; onPick: (i: number) => void }) {
  return (
    <ol className="mt-4 grid border-b border-line" style={{ gridTemplateColumns: `repeat(${labels.length}, minmax(0, 1fr))` }} data-wizard-steps>
      {labels.map((l, i) => (
        <li key={l}>
          <button type="button" onClick={() => onPick(i)} aria-current={i === at ? "step" : undefined} className={"flex w-full min-w-0 items-center gap-2 border-b-2 py-2.5 text-left text-[13px] font-semibold " + (i === at ? "border-magenta text-magenta-dark" : i < at ? "border-ink text-ink" : "border-transparent text-ink-3")}>
            <span className={"grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11.5px] font-bold " + (i < at ? "bg-ink text-surface" : i === at ? "bg-magenta text-white" : "border-2 border-[#C9CDDC] text-ink-3")}>{i < at ? "✓" : i + 1}</span>
            <span className="truncate max-[420px]:sr-only">{l}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}

/** CAT-E005: How You'll Get Paid — 3–4 small steps filled from the page's choices. */
export function PaidStrip({ steps }: { steps: string[] }) {
  return (
    <div data-paid-strip className="mt-3 border border-line bg-bg-soft px-4 py-3">
      <p className="text-[11px] font-bold tracking-[0.1em] text-ink-2">HOW YOU&apos;LL GET PAID</p>
      <ol className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
        {steps.map((s, i) => (
          <li key={i} className="flex items-center gap-2">
            {i > 0 && <span aria-hidden className="text-ink-3">→</span>}
            <span><b className="mr-1 text-ink-3">{i + 1}</b>{s}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** CAT-E004: Save Draft always; Publish only when the seller's company is validated. */
export function PublishBar({ canPublish, gateHref, gateReason, busy, onSave, publishLabel = "Publish" }: { canPublish: boolean; gateHref: string; gateReason: string | null; busy: boolean; onSave: (publish: boolean) => void; publishLabel?: string }) {
  return (
    <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-4" data-publish-bar>
      <button type="button" disabled={busy} onClick={() => onSave(false)} className={BTN}>Save Draft</button>
      <button type="button" disabled={busy || !canPublish} onClick={() => onSave(true)} data-publish className={BTN_K}>{publishLabel}</button>
      {!canPublish && (
        <p className="w-full text-[13px] text-ink-2">
          You can publish once your company is validated. {gateReason} <Link href={gateHref} className="font-bold text-magenta-dark underline underline-offset-4">Go to That Step</Link>
        </p>
      )}
    </div>
  );
}

export const money = (c: number | null | undefined) => (c == null ? "—" : `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
