import { guardPage } from "@/lib/guard";
import { CatalogTabs } from "@/components/catalog/CatalogTabs";
import { EstimatesBody } from "@/components/catalog/EstimatesBody";

export const metadata = { title: "Estimates · My Catalog · Panameer" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const viewer = await guardPage("canProvideServices");
  return <EstimatesBody viewer={viewer} side="seller" tabs={<CatalogTabs current="estimates" />} />;
}
