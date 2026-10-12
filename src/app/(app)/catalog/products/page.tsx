import { guardPage } from "@/lib/guard";
import { catalogProductsPage } from "@/lib/catalog-products";
import { CatalogTabs } from "@/components/catalog/CatalogTabs";
import { ProductsTab } from "@/components/catalog/ProductsTab";
import { ResumeSuggestions } from "@/components/catalog/ResumeSuggestions";
import { openSuggestions } from "@/lib/catalog-suggestions";
import { ownedProviderProfile } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Service Products · My Catalog · Panameer" };
export const dynamic = "force-dynamic";

// MC-E006: My Catalog › Service Products (mockup D).
export default async function Page({ searchParams }: { searchParams: Promise<{ edit?: string; type?: string }> }) {
  const viewer = await guardPage("canProvideServices");
  const d = await catalogProductsPage(viewer);
  const { edit, type } = await searchParams;
  // Résumé drafts for Service Products — only types still in the catalog (retired types drop out).
  const me = await prisma.providerProfile.findFirst({ where: ownedProviderProfile(viewer), select: { id: true } });
  const typeName = new Map(d.types.map((t) => [t.id, t.name] as const));
  const sugs = me ? (await openSuggestions(me.id)).filter((x) => x.kind === "SERVICE_PRODUCT" && typeName.has(x.service_type_id)) : [];
  return (
    <div className="pm-white-page mx-auto w-full max-w-5xl" data-catalog-products>
      <CatalogTabs current="products" />
      <h1 className="mt-1 text-[28px] font-bold">Service Products</h1>
      <p className="mt-1 text-[14px] text-ink-2">Fixed-price and monthly offers buyers can buy in Shop.</p>
      {sugs.length > 0 && (
        <ResumeSuggestions pending={false} items={sugs.map((x) => ({ id: x.id, kind: x.kind, typeName: typeName.get(x.service_type_id)!, why: x.why, rateCents: x.rate_cents, unit: x.unit, title: x.title }))} />
      )}
      <ProductsTab key={`${edit ?? ""}|${d.products.map((p) => `${p.id}:${p.status}`).join()}`} types={d.types} products={d.products} domains={d.domains} skills={d.skills} sellGaps={d.sellGaps} editId={edit ?? null} typeId={type ?? null} />
    </div>
  );
}
