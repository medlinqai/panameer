import { guardPage } from "@/lib/guard";
import { catalogProductsPage } from "@/lib/catalog-products";
import { CatalogTabs } from "@/components/catalog/CatalogTabs";
import { ProductsTab } from "@/components/catalog/ProductsTab";

export const metadata = { title: "Service Products · My Catalog · Panameer" };
export const dynamic = "force-dynamic";

// MC-E006: My Catalog › Service Products (mockup D).
export default async function Page({ searchParams }: { searchParams: Promise<{ edit?: string; type?: string }> }) {
  const viewer = await guardPage("canProvideServices");
  const d = await catalogProductsPage(viewer);
  const { edit, type } = await searchParams;
  return (
    <div className="pm-white-page mx-auto w-full max-w-5xl" data-catalog-products>
      <CatalogTabs current="products" />
      <h1 className="mt-1 text-[28px] font-bold">Service Products</h1>
      <ProductsTab key={`${edit ?? ""}|${d.products.map((p) => `${p.id}:${p.status}`).join()}`} types={d.types} products={d.products} domains={d.domains} skills={d.skills} sellGaps={d.sellGaps} editId={edit ?? null} typeId={type ?? null} />
    </div>
  );
}
