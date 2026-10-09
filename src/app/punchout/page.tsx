import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { PUNCHOUT_COOKIE, sessionFor } from "@/lib/erp/punchout";
import { cartLines, searchServices } from "@/lib/erp/cart";
import { formatCents } from "@/lib/display";

export const dynamic = "force-dynamic";
export const metadata = { title: "Punchout · Panameer" };

const BTN_K = "inline-flex min-h-11 items-center bg-ink px-5 text-[14px] font-semibold text-surface hover:bg-ink-hover";
const INPUT = "h-10 border border-line bg-surface px-2.5 text-[14px]";

// X-E003: the punchout shop — find a provider, attach their service to the work request, return the cart to the ERP.
export default async function PunchoutPage({ searchParams }: { searchParams: Promise<{ q?: string; expired?: string; error?: string }> }) {
  const sp = await searchParams;
  const s = await sessionFor((await cookies()).get(PUNCHOUT_COOKIE)?.value);
  if (!s)
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-[24px] font-bold">This punchout session has ended</h1>
        <p className="mt-2 text-[15px] text-ink-2">Start again from your ERP requisition to find a provider on Panameer.</p>
      </main>
    );
  const [me, results, lines] = await Promise.all([
    prisma.person.findUnique({ where: { id: s.requester_person_id }, select: { first_name: true } }),
    searchServices(sp.q ?? ""),
    cartLines(s),
  ]);
  const total = lines.reduce((n, l) => n + (l.transaction_type === "SERVICE_BY_AMT" ? l.amount_cents ?? 0 : Math.round(Number(l.quantity ?? 0) * (l.unit_price_cents ?? 0))), 0);
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <p className="text-[11px] font-semibold tracking-[0.12em] text-magenta">PUNCHOUT · {s.connection.name.toUpperCase()}</p>
      <h1 className="mt-1 text-[28px] font-bold">Find a Provider{me?.first_name ? `, ${me.first_name}` : ""}</h1>
      <p className="mt-1 text-[14.5px] text-ink-2">Pick a provider&apos;s service, set the quantity, then return the cart to your ERP. Your ERP approves it and sends the purchase order.</p>
      {sp.error && <p role="alert" className="mt-3 text-[14px] font-semibold text-magenta-dark">{sp.error}</p>}

      <form method="get" className="mt-5 flex gap-2">
        <input name="q" defaultValue={sp.q ?? ""} placeholder="Search services or providers" aria-label="Search" className={`${INPUT} flex-1`} />
        <button className={BTN_K}>Search</button>
      </form>
      <ul className="mt-4 grid gap-2">
        {results.map((r) => (
          <li key={r.id} data-punchout-service className="border border-line bg-white p-4">
            <form method="post" action="/punchout/cart" className="flex flex-wrap items-end justify-between gap-3">
              <input type="hidden" name="action" value="add" />
              <input type="hidden" name="serviceId" value={r.id} />
              <div className="min-w-0">
                <p className="text-[15px] font-bold">{r.name}</p>
                <p className="text-[13.5px] text-ink-2">{r.providerName} · {r.type === "SERVICE_BY_QTY" ? `${formatCents(r.rateCents, "USD")} / ${(r.uom ?? "hour").toLowerCase()}` : `up to ${formatCents(r.rateCents, "USD")}`}</p>
              </div>
              <div className="flex flex-wrap items-end gap-2">
                {r.type === "SERVICE_BY_QTY" && <label className="text-[12px] font-bold">Quantity<input name="quantity" inputMode="decimal" required className={`${INPUT} block w-24`} /></label>}
                <label className="text-[12px] font-bold">Starts<input name="start" type="date" className={`${INPUT} block`} /></label>
                <label className="text-[12px] font-bold">Ends<input name="end" type="date" className={`${INPUT} block`} /></label>
                <button className="inline-flex min-h-10 items-center border border-ink px-4 text-[14px] font-semibold">Add to Cart</button>
              </div>
            </form>
          </li>
        ))}
        {results.length === 0 && <li className="text-[14px] text-ink-2">No services match. Try another word.</li>}
      </ul>

      <section className="mt-8 border-t border-line pt-5">
        <h2 className="text-[20px] font-bold">Cart</h2>
        {lines.length === 0 ? (
          <p className="mt-2 text-[14px] text-ink-2">Nothing yet.</p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {lines.map((l) => (
              <li key={l.id} data-cart-line className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2 text-[14px]">
                <span><b>{l.description}</b> · {l.transaction_type === "SERVICE_BY_AMT" ? `up to ${formatCents(l.amount_cents ?? 0, "USD")}` : `${Number(l.quantity)} × ${formatCents(l.unit_price_cents ?? 0, "USD")}`}</span>
                <form method="post" action="/punchout/cart"><input type="hidden" name="action" value="remove" /><input type="hidden" name="lineId" value={l.id} /><button className="text-[13px] font-semibold underline">Remove</button></form>
              </li>
            ))}
          </ul>
        )}
        <form method="post" action="/punchout/cart" className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <input type="hidden" name="action" value="return" />
          <span className="text-[16px] font-bold">Total {formatCents(total, "USD")}</span>
          <button disabled={!lines.length} className={`${BTN_K} disabled:opacity-40`}>Return to {s.connection.name}</button>
        </form>
      </section>
    </main>
  );
}
