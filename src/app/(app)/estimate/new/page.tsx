import { guardPage } from "@/lib/guard";
import { BackButton } from "@/components/casing/BackButton";
import { shopCategories } from "@/lib/shop-category-list";
import { productTypesByCategory } from "@/lib/shop-app";
import { estimateCandidates } from "@/lib/estimate-events";
import { prisma } from "@/lib/prisma";
import { RequestEstimateEvent } from "@/components/shop/RequestEstimateEvent";

export const dynamic = "force-dynamic";
export const metadata = { title: "Request an Estimate · Panameer" };

// ES-E002/E007: one form for every estimate request — from Shop, a product pane, or a seller's page (one provider).
export default async function Page({ searchParams }: { searchParams: Promise<{ product?: string; provider?: string; type?: string; service?: string }> }) {
  const viewer = await guardPage("authenticated");
  const sp = await searchParams;
  const [tiles, types, c] = await Promise.all([shopCategories(), productTypesByCategory(), estimateCandidates(viewer, { productId: sp.product, productTypeId: sp.type, providerPersonId: sp.provider })]);
  const typeId = c.productTypeId ?? "";
  const category = Object.entries(types).find(([, list]) => list.some((t) => t.id === typeId))?.[0] ?? "";
  const svc = sp.service ? await prisma.providerService.findUnique({ where: { id: sp.service }, select: { name: true } }) : null;
  return (
    <div className="pm-white-page mx-auto w-full max-w-3xl">
      <div className="mt-2"><BackButton fallback="/shop" /></div>
      <h1 className="text-[26px] font-extrabold">Request an Estimate</h1>
      <p className="text-[14px] text-ink-2">Describe what you need and ask up to 5 providers. Estimates come back by the deadline; compare them and award one.</p>
      <RequestEstimateEvent categories={tiles.map((t) => t.name)} types={types} initial={{ category, type: typeId, product: sp.product ?? "", provider: sp.provider ?? "", title: c.productTitle ?? svc?.name ?? "", candidates: c.candidates }} />
    </div>
  );
}
