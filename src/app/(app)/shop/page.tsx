import Link from "next/link";
import { FreeLine } from "@/components/marketing/FreeLine";
import { memberOrPublicTwin } from "@/lib/public-twin";
import { canProvideServices } from "@/lib/access";
import { listShopProducts } from "@/lib/shop";
import { formatCents } from "@/lib/display";

export const dynamic = "force-dynamic";
export const metadata = { title: "Search Service Products · Panameer" };

const priceLine = (p: { priceCents: number | null; currency: string; pricingType: string }) =>
  p.priceCents == null ? "Price on request" : `${formatCents(p.priceCents, p.currency)}${p.pricingType === "HOURLY" ? "/hr" : ""}`;

export default async function Page() {
  const viewer = await memberOrPublicTwin("/shop");
  const products = await listShopProducts();

  return (
    <div className="pm-white-page mx-auto w-full max-w-5xl">
      {canProvideServices(viewer) && (
        <nav aria-label="Selling" className="mb-4 flex flex-wrap items-center gap-2">
          <Link href="/my-services" className="inline-flex min-h-11 items-center border border-ink bg-surface px-4 text-[14px] font-semibold hover:bg-surface-hover">
            Sell Your Services
          </Link>
        </nav>
      )}
      <h1 className="text-[28px] font-bold">Service Products</h1>
      <FreeLine claim="List the services you sell, free." />
      {products.length === 0 ? (
        <p className="mt-6 border-t border-line py-5 text-[14px] text-ink-2">No service products are published yet.</p>
      ) : (
        <ul data-testid="shop-list" className="mt-6">
          {products.map((p) => (
            <li key={p.id} className="flex flex-wrap items-start justify-between gap-3 border-t border-line py-4">
              <div className="min-w-0">
                <Link href={`/shop/${p.id}`} className="text-[16px] font-semibold hover:underline">{p.title}</Link>
                <p className="mt-0.5 text-[13px] text-ink-2">by {p.providerName}</p>
                {p.summary && <p className="mt-1 max-w-2xl text-[14px] leading-relaxed text-ink-2">{p.summary}</p>}
              </div>
              <div className="text-right">
                <p className="text-[15px] font-semibold tabular-nums">{priceLine(p)}</p>
                <Link href={`/shop/${p.id}`} className="mt-1 inline-block text-[13px] font-semibold text-magenta-dark hover:underline">
                  View and make an offer
                </Link>
                {/* EST-E001 */}
                <Link href={`/estimates/request?provider=${p.providerPersonId}&product=${p.id}`} data-request-estimate-link className="mt-1 block text-[13px] font-semibold text-ink-2 underline underline-offset-4 hover:text-ink">
                  Request an Estimate
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
