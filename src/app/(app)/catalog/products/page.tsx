import { guardPage } from "@/lib/guard";
import { sellGaps } from "@/lib/gate-reads";
import { CatalogTabs } from "@/components/catalog/CatalogTabs";
import { ServiceProductsManager } from "@/components/service-products/ServiceProductsManager";

export const metadata = { title: "Service Products · My Catalog · Panameer" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const viewer = await guardPage("canProvideServices");
  return (
    <div className="pm-white-page mx-auto w-full max-w-5xl" data-catalog-products>
      <CatalogTabs current="products" />
      <h1 className="mt-1 text-[28px] font-bold">Service Products</h1>
      <p className="mt-1 text-[14px] text-ink-2">Fixed-price and monthly offers buyers can buy in Shop.</p>
      <div className="mt-4"><ServiceProductsManager sellGaps={await sellGaps(viewer.userId)} /></div>
    </div>
  );
}
