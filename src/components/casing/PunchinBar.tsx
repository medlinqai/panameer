import Link from "next/link";
import { currentPunchin } from "@/lib/erp/punchin-live";
import { formatCents } from "@/lib/display";

// PI-E002: under the casing while punched in — where the visitor came from, the cart, and the one way back.
export async function PunchinBar() {
  const p = await currentPunchin();
  if (!p) return null;
  if (p.state !== "live") {
    return (
      <div className="border-b border-state-border bg-bg-soft px-5 py-2 text-[13px] text-ink-2 sm:px-8" data-punchin-bar={p.state}>
        {p.state === "returned" ? <>Returned to <b className="text-ink">{p.erpName}</b> — approve it there.</> : <>Punch-in ended — you&apos;re still signed in to Panameer.</>}
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-state-border bg-white px-5 py-2.5 text-[13.5px] sm:px-8" data-punchin-bar="live">
      <span>Punch-in from <b>{p.erpName}</b></span>
      <span className="text-ink-2">Cart: <b className="text-ink">{p.count} item{p.count === 1 ? "" : "s"} · {formatCents(p.totalCents, "USD")}</b></span>
      <Link href="/shop?tab=cart" className="font-semibold">See Cart</Link>
      <span className="flex-1" />
      <form method="post" action="/punchout/cart">
        <input type="hidden" name="action" value="return" />
        <button type="submit" disabled={!p.count} className="inline-flex min-h-9 items-center bg-magenta px-4 text-[13px] font-bold text-white hover:bg-magenta-dark disabled:opacity-40" data-return-cart>Return Cart to {p.erpName}</button>
      </form>
    </div>
  );
}
