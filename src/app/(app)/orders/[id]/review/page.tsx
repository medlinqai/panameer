import Link from "next/link";
import { guardPage } from "@/lib/guard";
import { REVIEW_FIELDS, ReviewError, reviewContext } from "@/lib/order-reviews";
import { OrderReviewForm } from "@/components/orders/OrderReviewForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Order Review · Panameer" };

// OR-E002: one short form — four 1–5 star scores and an optional comment.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await guardPage("authenticated");
  const { id } = await params;
  let ctx: Awaited<ReturnType<typeof reviewContext>>;
  try {
    ctx = await reviewContext(viewer, id);
  } catch (e) {
    if (!(e instanceof ReviewError)) throw e;
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <p className="text-[15px]">{e.message}</p>
        <Link href="/worklist" className="mt-3 inline-block font-semibold underline">Back to Worklist</Link>
      </div>
    );
  }
  const fields = REVIEW_FIELDS[ctx.side].map(([key, label]) => ({ key, label, value: ctx.mine ? (ctx.mine[key as keyof typeof ctx.mine] as number | null) : null }));
  const due = ctx.due.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York" });
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8 font-body text-ink">
      <Link href={`/orders/${id}`} className="text-[13px] font-semibold text-ink-2 hover:underline">← Back to the Order</Link>
      <h1 className="mt-3 text-[26px] font-extrabold leading-tight">Review {ctx.otherName}</h1>
      <p className="mt-1 text-[14px] text-ink-2">{ctx.title} · {ctx.order.order_number}</p>
      <OrderReviewForm
        orderId={id}
        side={ctx.side}
        otherName={ctx.otherName}
        fields={fields}
        comment={ctx.mine?.comment ?? ""}
        submitted={!!ctx.mine}
        canEdit={ctx.canEdit}
        due={due}
      />
    </div>
  );
}
