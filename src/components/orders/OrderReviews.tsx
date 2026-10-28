import { REVIEW_FIELDS } from "@/lib/order-reviews";
import type { OrderReview } from "@prisma/client";

// OR-E003: the Order page shows both reviews once they're visible (yours always shows to you).
export function OrderReviews({ mine, theirs, otherName }: { mine: OrderReview | null; theirs: OrderReview | null; otherName: string }) {
  if (!mine && !theirs) return null;
  return (
    <section className="mt-6" data-order-reviews>
      <h2 className="text-[13px] font-extrabold uppercase tracking-[0.1em]">Order Reviews</h2>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        {mine && <One r={mine} who="Your Review" />}
        {theirs ? <One r={theirs} who={`${otherName}'s Review`} /> : <p className="rounded-[12px] border border-line p-4 text-[14px] text-ink-2">{otherName}&apos;s review shows once they submit it, or when the review window ends.</p>}
      </div>
    </section>
  );
}

function One({ r, who }: { r: OrderReview; who: string }) {
  return (
    <div className="rounded-[12px] border border-line bg-surface p-4">
      <div className="flex items-baseline justify-between">
        <b className="text-[14.5px]">{who}</b>
        <span className="text-[14px] font-bold">★ {r.overall.toFixed(1)}</span>
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[13px]">
        {REVIEW_FIELDS[r.side].map(([k, label]) => (
          <div key={k} className="flex justify-between gap-2"><dt className="text-ink-2">{label}</dt><dd className="font-semibold">{(r[k as keyof OrderReview] as number | null) ?? "—"}</dd></div>
        ))}
      </dl>
      {r.comment && !r.comment_hidden_at && <p className="mt-2 text-[14px]">&ldquo;{r.comment}&rdquo;</p>}
    </div>
  );
}
