import Link from "next/link";
import { redirect } from "next/navigation";
import { guardPage } from "@/lib/guard";
import { getSessionViewer } from "@/lib/session";
import { PageTabs } from "@/components/casing/PageTabs";
import { PAGE_TABS, tabSequenceFor } from "@/lib/nav";
import { Button } from "@/components/casing/Button";
import { SettlementRowCard } from "@/components/settle/SettlementRows";
import { listSettlements } from "@/lib/settlements";
import { settleableOrdersFor } from "@/lib/settlements";

/**
 * `/finances/payment-requests` — THE PROVIDER'S LIST (`P1-J4-E394`).
 *
 * ⚠ SUPERSEDED, QUOTED NOT DELETED — this page was: *"Payment Requests — a titled
 * placeholder (WS1-B). E216 — reached from its section's TAB ROW now, not a rail
 * flyout. The route, its title and its gate are real; only the content is
 * pending, which is why a titled empty state is the honest thing rather than a
 * 404 or a fake table."* The content is no longer pending. **The tab row, the
 * title and the gate are unchanged.**
 *
 * ⚠⚠ THIS IS A LIST, NOT A CREATE FLOW. `nav.ts`: payment requests are
 * *"generated from a Work Order"*, so raising one lives at `/orders/[id]/settle`
 * and this page LINKS there. A "new payment request" button here that then asked
 * which order would be the rail-item-for-a-tab mistake in another shape.
 *
 * ⚠ AND WHEN THERE IS NOTHING RELEASED, IT SAYS SO — the brief forbids rendering
 * an empty create form, and this is the honest version of the same rule: name the
 * reason there is nothing to raise.
 */
export const metadata = { title: "Payment Requests · Panameer" };

export default async function Page() {
  await guardPage("authenticated");
  const viewer = await getSessionViewer();
  if (!viewer) redirect("/login?callbackUrl=%2Ffinances%2Fpayment-requests");

  const [all, settleable] = await Promise.all([
    listSettlements(viewer),
    settleableOrdersFor(viewer),
  ]);
  /* ⚠ THE PROVIDER'S SIDE. Somebody who also buys reads their approval queue on
     `/pay`; this page is what they have RAISED. */
  const mine = all.filter((s) => s.party === "PROVIDER");

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageTabs
        sequence={tabSequenceFor("/finances")} tabs={PAGE_TABS["/finances"]} current="/finances/payment-requests" />

      <h1 className="mt-6 font-display text-[28px] font-bold tracking-[-0.5px]">
        Payment Requests
      </h1>
      <p className="mt-1.5 text-[15px] text-ink-2">
        {mine.length === 0
          ? "You haven't raised a payment request yet."
          : `${mine.length} raised · ${mine.filter((s) => s.status === "SUBMITTED").length} awaiting approval`}
      </p>

      {/*
        ⚠⚠ THE ANSWER TO "WHAT DOES A PROVIDER SEE WHEN NOTHING IS RELEASED."
        Not an empty form, and not a dead button — the reason, named. A work order
        has to be ACCEPTED by the provider and then RELEASED by the buyer (`E393`)
        before anything can be claimed against it.
      */}
      {settleable.length === 0 ? (
        <div className="mt-7 rounded-brand border border-dashed border-line px-6 py-10 text-center">
          <p className="text-[16px] font-bold">No work order is ready to bill against</p>
          <p className="mx-auto mt-2 max-w-lg text-[14.5px] leading-relaxed text-ink-2">
            A payment request is raised against a <b>released</b> work order. An
            order becomes released after you accept its terms and the buyer
            releases it — until then there is nothing to claim.
          </p>
          <Button href="/orders" className="mt-6" variant="ghost">
            See your work orders
          </Button>
        </div>
      ) : (
        <div className="mt-7 rounded-brand border border-line bg-white p-5">
          <p className="text-[15px] font-bold">
            {settleable.length} work order{settleable.length === 1 ? "" : "s"} ready to bill
            against
          </p>
          <ul className="mt-3 grid gap-2">
            {settleable.map((o) => (
              <li
                key={o.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] border border-line px-4 py-3"
              >
                <span>
                  <Link href={`/orders/${o.id}`} className="font-mono font-bold hover:text-magenta">
                    {o.orderNumber}
                  </Link>
                  <span className="ml-2 text-[13.5px] text-ink-2">{o.counterpartyName}</span>
                </span>
                {/* ⚠ RAISING LIVES INSIDE THE ORDER — this is a link there. */}
                <Button href={`/orders/${o.id}/settle`} variant="ghost">
                  Raise a payment request
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {mine.length > 0 && (
        <ul className="mt-7 grid gap-3">
          {mine.map((s) => (
            <SettlementRowCard key={s.id} row={s} />
          ))}
        </ul>
      )}
    </div>
  );
}
