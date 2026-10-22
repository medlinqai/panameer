import Link from "next/link";
import { notFound } from "next/navigation";
import { guardPage } from "@/lib/guard";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Work Request Submitted · Panameer" };

// WA-E001: after Submit — the Work Request was submitted and (auto-)approved, and its Work Order is ready for the buyer's review.
export default async function Page({ searchParams }: { searchParams: Promise<{ wo?: string }> }) {
  const viewer = await guardPage("canHireTalent");
  const { wo } = await searchParams;
  if (!wo) notFound();
  const me = await prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { id: true } });
  const order = await prisma.workOrder.findUnique({ where: { id: wo }, select: { id: true, order_number: true, buyer_person_id: true, workRequest: { select: { wr_number: true, approval_note: true, job: { select: { id: true, title: true } } } } } });
  if (!order || order.buyer_person_id !== me?.id) notFound();
  const wr = order.workRequest;
  return (
    <div className="pm-white-page mx-auto w-full max-w-2xl" data-wr-submitted>
      <h1 className="mt-4 text-[26px] font-extrabold">Work Request submitted</h1>
      <p className="mt-2 text-[15px]">
        Work Request <b>{wr?.wr_number ?? "—"}</b> submitted and approved. Work Order <b className="whitespace-nowrap">{order.order_number}</b>{"\u00a0"}is ready for your review. We&apos;ve also sent you a link.
      </p>
      {wr?.approval_note && <p className="mt-1 text-[13px] text-ink-3">{wr.approval_note}</p>}
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <Link href={`/orders/${order.id}`} className="inline-flex min-h-11 items-center bg-ink px-6 text-[14.5px] font-bold text-surface hover:bg-ink-hover" data-review-work-order>Review Work Order</Link>
        {wr?.job && <Link href={`/work-requests/${wr.job.id}`} className="text-[14px] font-semibold text-magenta-dark underline underline-offset-4">Back to {wr.job.title || "the job"}</Link>}
      </div>
    </div>
  );
}
