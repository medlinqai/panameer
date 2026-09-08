import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { guardPage } from "@/lib/guard";
import { getSessionViewer } from "@/lib/session";
import { Button } from "@/components/casing/Button";
import { RaiseSettlement } from "@/components/settle/RaiseSettlement";
import { settleFormFor, SettlementError } from "@/lib/settlements";

/**
 * `/orders/[id]/settle` — RAISE A PAYMENT REQUEST (`P1-J4-E394` WS-1 + WS-2).
 *
 * ⚠⚠ IT LIVES INSIDE THE ORDER BECAUSE `nav.ts` SAYS SO: *"Timesheet and
 * fixed-firm-price billing both surface as Payment Requests generated from a Work
 * Order… A rail item for a thing that is a tab inside another thing taught the
 * wrong model of how work gets billed."* There is deliberately no top-level
 * "raise a settlement" route.
 *
 * ⚠ AND THE REFUSALS ARE EXPLAINED, NOT 404'd. A buyer who follows this URL, or a
 * provider whose order is not released, gets a sentence saying which — an empty
 * form would be the `E034` shape, and the brief forbids it by name.
 */
export const metadata = { title: "Raise a Payment Request · Panameer" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
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
      /*
        ⚠ THE TWO LEGITIMATE REFUSALS, EACH SAYING WHICH IT IS. "Only the provider
        can raise one" and "this order is not released yet" are different problems
        with different next steps, and a shared "you can't do that" would hide
        both.
      */
      return (
        <div className="mx-auto w-full max-w-3xl">
          <Link href={`/orders/${id}`} className="text-[13.5px] font-semibold text-ink-2 hover:text-magenta">
            ← Back to the work order
          </Link>
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

  return (
    <div className="mx-auto w-full max-w-3xl">
      <Link href={`/orders/${form.orderId}`} className="text-[13.5px] font-semibold text-ink-2 hover:text-magenta">
        ← {form.orderNumber}
      </Link>
      <h1 className="mt-2 font-display text-[28px] font-bold tracking-[-0.5px]">
        Raise a payment request
      </h1>
      <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-ink-2">
        For {form.buyerName}, against {form.orderNumber}. Claim time on rate lines
        and fixed amounts in full; {form.buyerName} approves or sends it back with
        a reason.
      </p>

      <div className="mt-7">
        <RaiseSettlement form={form} />
      </div>
    </div>
  );
}
