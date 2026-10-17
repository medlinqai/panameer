import Link from "next/link";
import { notFound } from "next/navigation";
import { guardPage } from "@/lib/guard";
import { getShopProduct, maskProducts, talentVisibleTo } from "@/lib/shop";
import { seesTestAccounts } from "@/lib/admin/test-accounts";
import { formatCents } from "@/lib/display";
import { prisma } from "@/lib/prisma";
import { ShopTabs } from "@/components/shop/ShopTabs";
import { BuyButtons } from "@/components/shop/BuyButtons";
import { BackLink } from "@/components/console/BackLink";

export const dynamic = "force-dynamic";
export const metadata = { title: "Service Product · Panameer" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await guardPage("authenticated");
  const { id } = await params;
  const found = await getShopProduct(id, await seesTestAccounts(viewer));
  if (!found) notFound();
  // SH-E005: a talent seller shows masked ("Oracle P2P consultant") until this buyer may see them.
  const [p] = maskProducts([found], await talentVisibleTo(viewer));
  const me = await prisma.person.findFirst({ where: { user_id: viewer.userId }, select: { id: true } });
  const own = me?.id === p.providerPersonId;

  return (
    <div className="pm-white-page mx-auto w-full max-w-5xl">
      <ShopTabs />
      <div className="max-w-3xl">
      <BackLink href="/shop/products" label="Products" />
      <h1 className="mt-2 text-[28px] font-bold">{p.title}</h1>
      <p className="mt-1 text-[14px] text-ink-2">
        by {p.masked ? <span data-masked-seller>{p.providerName}</span> : <Link href={`/providers/${p.providerProfileId}`} className="underline">{p.providerName}</Link>}
        {p.durationWeeks ? ` · about ${p.durationWeeks} week${p.durationWeeks === 1 ? "" : "s"}` : ""}
      </p>
      <p className="mt-4 text-[22px] font-semibold">
        {p.priceCents == null ? "Price on request" : formatCents(p.priceCents, p.currency)}
        {p.pricingType === "HOURLY" ? "/hr" : ""}
      </p>
      {p.summary && <p className="mt-4 text-[15px] leading-relaxed">{p.summary}</p>}
      {p.detailsPdfUrl && <p className="mt-3"><a href={p.detailsPdfUrl} target="_blank" rel="noreferrer" data-details-pdf className="text-[14.5px] font-bold text-magenta-dark underline underline-offset-4">Details (PDF)</a></p>}
      {p.deliverables.length > 0 && (
        <section className="mt-6 border-t border-line pt-4">
          <h2 className="text-[18px] font-bold">What you get</h2>
          <ul className="mt-2 list-disc pl-5 text-[14.5px] leading-relaxed">
            {p.deliverables.map((d) => <li key={d}>{d}</li>)}
          </ul>
        </section>
      )}
      <section className="mt-6 border-t border-line pt-5">
        {own ? (
          <p className="text-[14px] text-ink-2">This is your service product. Orders for it arrive in <Link href="/orders" className="underline">Work Orders</Link>.</p>
        ) : (
          <>
            {p.priceCents != null && <BuyButtons productId={p.id} signedIn openToOffers={p.openToOffers} />}
          </>
        )}
      </section>
      </div>
    </div>
  );
}
