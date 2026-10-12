import { guardPage } from "@/lib/guard";
import { ShopTabs } from "@/components/shop/ShopTabs";
import { EstimatesBody } from "@/components/catalog/EstimatesBody";

export const metadata = { title: "Estimates · Panameer" };
export const dynamic = "force-dynamic";

// EST-E003: My › Estimates — Received (buyer) and Sent (provider). Sellers reach the same list under My Catalog.
export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const viewer = await guardPage("authenticated");
  return <EstimatesBody viewer={viewer} raw={(await searchParams).tab} base="/estimates" tabs={<ShopTabs />} />;
}
