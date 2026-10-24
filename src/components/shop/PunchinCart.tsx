import { currentPunchin } from "@/lib/erp/punchin-live";
import { cartLines } from "@/lib/erp/cart";
import { cxmlUom } from "@/lib/erp/cxml";
import { formatCents } from "@/lib/display";

// PI-E003/E005: Shop › Cart while punched in — the lines going back to the ERP (as the ERP will see them), and Return.
export async function PunchinCart() {
  const p = await currentPunchin();
  if (!p) return null;
  if (p.state !== "live" || !p.session) return <p className="py-6 text-[15px] text-ink-2" data-punchin-cart={p.state}>{p.state === "returned" ? <>Returned to <b className="text-ink">{p.erpName}</b> — approve it there.</> : "This punch-in has ended. Start again from your ERP."}</p>;
  const lines = await cartLines(p.session);
  return (
    <section className="py-4" data-punchin-cart="live">
      <h2 className="text-[22px] font-bold">Cart · Going Back to {p.erpName}</h2>
      <p className="mt-1 text-[14px] text-ink-2">Everything you add from Shop or Hire goes here. Return the cart and {p.erpName} approves it and sends the purchase order.</p>
      {lines.length ? (
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {lines.map((l) => {
            const byQty = l.transaction_type !== "SERVICE_BY_AMT";
            const qty = byQty ? Number(l.quantity ?? 0) : l.eaQuantity ?? 1;
            const total = byQty ? Math.round(qty * (l.unit_price_cents ?? 0)) : l.amount_cents ?? 0;
            return (
              <li key={l.id} className="flex flex-wrap items-center gap-3 py-3" data-punchin-line>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold">{l.description}</p>
                  <p className="text-[12.5px] text-ink-3">Sent to your ERP as {qty} {byQty ? cxmlUom(l.uom) : "EA"} · UNSPSC {l.unspsc_code ?? "80101500"}</p>
                </div>
                <b className="text-[15px]">{formatCents(total, "USD")}</b>
                {!l.work_order_id && (
                  <form method="post" action="/punchout/cart"><input type="hidden" name="action" value="remove" /><input type="hidden" name="lineId" value={l.id} /><button type="submit" className="text-[13px] font-semibold text-state-declined underline">Remove</button></form>
                )}
              </li>
            );
          })}
        </ul>
      ) : <p className="mt-4 text-[14px] text-ink-2">Nothing yet — add a Service Product from Shop, or Hire a provider on a Job.</p>}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <b className="text-[16px]">Total {formatCents(p.totalCents, "USD")}</b>
        <form method="post" action="/punchout/cart"><input type="hidden" name="action" value="return" /><button type="submit" disabled={!lines.length} className="inline-flex min-h-11 items-center bg-magenta px-6 text-[14px] font-bold text-white hover:bg-magenta-dark disabled:opacity-40" data-return-cart-page>Return Cart to {p.erpName}</button></form>
      </div>
    </section>
  );
}
