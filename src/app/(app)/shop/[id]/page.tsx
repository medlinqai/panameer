import Link from "next/link";
import { notFound } from "next/navigation";
import { guardPage } from "@/lib/guard";
import { viewerCanHire } from "@/lib/rate-visibility";
import { getShopProduct } from "@/lib/shop";
import { formatCents } from "@/lib/display";
import { prisma } from "@/lib/prisma";
import { MakeOffer } from "@/components/shop/MakeOffer";
import { BackLink } from "@/components/console/BackLink";

export const dynamic = "force-dynamic";
export const metadata = { title: "Service Product · Panameer" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await guardPage("authenticated");
  const { id } = await params;
  const p = await getShopProduct(id);
  if (!p) notFound();
  const me = await prisma.person.findFirst({ where: { user_id: viewer.userId }, select: { id: true } });
  const own = me?.id === p.providerPersonId;
  const canBuy = !own && viewerCanHire(viewer);

  return (
    <div className="pm-white-page mx-auto w-full max-w-3xl">
      <BackLink href="/shop" label="Service Products" />
      <h1 className="mt-2 text-[28px] font-bold">{p.title}</h1>
      <p className="mt-1 text-[14px] text-ink-2">
        by <Link href={`/providers/${p.providerProfileId}`} className="underline">{p.providerName}</Link>
        {p.durationWeeks ? ` · about ${p.durationWeeks} week${p.durationWeeks === 1 ? "" : "s"}` : ""}
      </p>
      <p className="mt-4 text-[22px] font-semibold">
        {p.priceCents == null ? "Price on request" : formatCents(p.priceCents, p.currency)}
        {p.pricingType === "HOURLY" ? "/hr" : ""}
      </p>
      {p.summary && <p className="mt-4 text-[15px] leading-relaxed">{p.summary}</p>}
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
          <p className="text-[14px] text-ink-2">This is your service product. Offers on it arrive in <Link href="/services/offers" className="underline">Offers</Link>.</p>
        ) : canBuy ? (
          <>
          <MakeOffer productId={p.id} priceCents={p.priceCents} providerName={p.providerName} />
          <Link href={`/estimates/request?provider=${p.providerPersonId}&product=${p.id}`} data-request-estimate-link className="mt-3 inline-flex min-h-11 items-center border border-ink px-5 text-[14px] font-semibold hover:bg-surface-hover">Request an Estimate</Link>
          </>
        ) : (
          <p className="text-[14px] text-ink-2">Making an offer needs a buyer account. Turn on buying in Settings to make one.</p>
        )}
      </section>
    </div>
  );
}
