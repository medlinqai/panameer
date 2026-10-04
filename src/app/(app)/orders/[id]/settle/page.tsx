import { notFound, redirect } from "next/navigation";
import { guardPage } from "@/lib/guard";
import { getSessionViewer } from "@/lib/session";
import { Button } from "@/components/casing/Button";
import { RaiseSettlement, type ResubmitPrefill } from "@/components/settle/RaiseSettlement";
import { getSettlement, settleFormFor, SettlementError } from "@/lib/settlements";
import { BackLink } from "@/components/console/BackLink";

export const metadata = { title: "Raise a Payment Request · Panameer" };

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  await guardPage("authenticated");
  const viewer = await getSessionViewer();
  const { id } = await params;
  if (!viewer) redirect(`/login?callbackUrl=${encodeURIComponent(`/orders/${id}/settle`)}`);

  let form;
  try {
    form = await settleFormFor(viewer, id);
  } catch (e) {
    if (e instanceof SettlementError && e.code === "NOT_FOUND") notFound();
    if (e instanceof SettlementError) {
      return (
        <div className="mx-auto w-full max-w-3xl">
          <BackLink href={`/orders/${id}`} label="the Work Order" />
          <div className="mt-5 rounded-brand border border-dashed border-line px-6 py-12 text-center">
            <p className="text-[16px] font-bold">This order cannot be settled yet</p>
            <p className="mx-auto mt-2 max-w-md text-[14.5px] leading-relaxed text-ink-2">
              {e.message}.
            </p>
            <Button href={`/orders/${id}`} className="mt-6" variant="ghost">
              Open the work order
            </Button>
          </div>
        </div>
      );
    }
    /* ⚠ A NON-PARTY NEVER GETS HERE — `getOrderDetail` threw NOT_FOUND first. */
    throw e;
  }

  const { from } = await searchParams;
  let resubmit: ResubmitPrefill | null = null;
  if (from) {
    const prev = await getSettlement(viewer, from).catch(() => null);
    if (prev && prev.orderId === form.orderId && prev.status === "REJECTED" && !prev.resubmittedAs)
      resubmit = {
        id: prev.id,
        number: prev.settlementNumber,
        periodStart: prev.periodStart,
        periodEnd: prev.periodEnd,
        rate: prev.lines.filter((l) => l.basis === "RATE").map((l) => ({ workOrderLineId: l.workOrderLineId, serviceDate: l.serviceDate ?? "", quantity: l.quantity ?? 0, note: l.note ?? "" })),
        amountLineIds: prev.lines.filter((l) => l.basis === "AMOUNT").map((l) => l.workOrderLineId),
      };
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <BackLink href={`/orders/${form.orderId}`} label={form.orderNumber} />
      <h1 className="mt-2 font-display text-[28px] font-bold tracking-[-0.5px]">
        {resubmit ? `Resubmit ${resubmit.number}` : "Raise a payment request"}
      </h1>
      <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-ink-2">
        For {form.buyerName}, against {form.orderNumber}. Claim time on rate lines
        and fixed amounts in full; {form.buyerName} approves or sends it back with
        a reason.
      </p>

      <div className="mt-7">
        <RaiseSettlement form={form} resubmit={resubmit} />
      </div>
    </div>
  );
}
