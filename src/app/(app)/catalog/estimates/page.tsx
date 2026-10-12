import { guardPage } from "@/lib/guard";
import { CatalogTabs } from "@/components/catalog/CatalogTabs";
import { EstimatesBody } from "@/components/catalog/EstimatesBody";

export const metadata = { title: "Estimates · My Catalog · Panameer" };
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const viewer = await guardPage("canProvideServices");
  return <EstimatesBody viewer={viewer} raw={(await searchParams).tab} base="/catalog/estimates" tabs={<CatalogTabs current="estimates" />} />;
}
