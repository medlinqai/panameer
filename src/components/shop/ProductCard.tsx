"use client";


import { DefaultCover } from "@/components/catalog/DefaultCover";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, isMaskedName } from "@/components/Avatar";
import { BuyButtons } from "@/components/shop/BuyButtons";
import { useMe } from "@/components/MeProvider";
import { formatCents } from "@/lib/display";
import type { ShopProduct } from "@/lib/shop";

// WS-E006: the compact product card — Shop, All Service Products and the profile, 2-up.
const TONE: Record<string, [string, string]> = {
  DELIVERABLE: ["#272334", "#4b3e6e"],
  DEPLOYABLE: ["#1a2a30", "#2f5a6b"],
  HOURS: ["#1d2a3a", "#36506e"],
  BLANKET: ["#2b2219", "#6a4a2f"],
};
export const KIND_LABEL: Record<string, string> = { DELIVERABLE: "Deliverable", DEPLOYABLE: "AI Agent", HOURS: "Hours", BLANKET: "Blanket" };

export type CardProduct = Pick<ShopProduct, "id" | "title" | "kind" | "pricingType" | "billingPeriod" | "priceCents" | "currency" | "durationWeeks" | "providerName" | "providerFirst" | "providerLast" | "providerPhotoUrl" | "providerPersonId" | "providerProfileId" | "coverCode" | "coverUrl" | "coverStyle" | "typeName" | "terms" | "orders" | "fresh"> & { summary?: string | null } & { openToOffers?: boolean } & Partial<Pick<ShopProduct, "category" | "leadDays" | "companyName">>;

const code = (p: CardProduct) => (p.coverCode || p.title.split(/\s+/).filter((w) => /^[A-Za-z]/.test(w)).slice(0, 2).map((w) => w[0]).join("")).toUpperCase().slice(0, 3);

export function priceLabel(p: Pick<CardProduct, "priceCents" | "currency" | "pricingType" | "billingPeriod">) {
  if (p.priceCents == null) return "Price on request";
  const per = p.pricingType === "HOURLY" ? " / hr" : p.pricingType === "RECURRING" ? (p.billingPeriod === "ANNUAL" ? " / year" : " / month") : "";
  return `${formatCents(p.priceCents, p.currency)}${per}`;
}

export function ProductCard({ p, signedIn, own = false, inCartLineId = null, tile = false }: { p: CardProduct; signedIn: boolean; own?: boolean; inCartLineId?: string | null; tile?: boolean }) {
  if (tile) return <ProductTile p={p} signedIn={signedIn} own={own} inCartLineId={inCartLineId} />;
  return <ProductRow p={p} signedIn={signedIn} own={own} inCartLineId={inCartLineId} />;
}

// SH2-E003: the Shop card (mockup 10-18) — Category, name, seller, price / per, Buy Now + Make an Offer or Add to Work Request.
function ProductTile({ p, signedIn, own, inCartLineId }: { p: CardProduct; signedIn: boolean; own: boolean; inCartLineId: string | null }) {
  const per = p.pricingType === "RECURRING" ? (p.billingPeriod === "ANNUAL" ? "/ year" : "/ month") : p.pricingType === "HOURLY" ? "/ hr" : "one time";
  const seller = p.companyName || p.providerName;
  return (
    <article data-product-card className="flex flex-col gap-1 rounded-[10px] border border-line bg-white p-3.5">
      <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-magenta-dark">{p.category ?? ""}</span>
      <h3 className="text-[15px] font-extrabold leading-snug"><Link href={`/shop/${p.id}`} className="hover:underline">{p.title}</Link></h3>
      <Link href={`/providers/${p.providerProfileId}`} data-card-seller className="flex min-w-0 items-center gap-1.5 text-[12.5px] text-ink-2 hover:underline">
        <Avatar firstName={p.providerFirst} lastName={p.providerLast} photoUrl={p.providerPhotoUrl} size={20} masked={isMaskedName(p.providerName)} />
        <span className="truncate">{seller}</span>
      </Link>
      <p className="mt-auto pt-1.5 text-[17px] font-extrabold tabular-nums">
        {p.priceCents == null ? "Quote" : formatCents(p.priceCents, p.currency)}
        {p.priceCents != null && <small className="ml-1 text-[12px] font-medium text-ink-2">{per}</small>}
      </p>
      {p.openToOffers && <span className="w-max border border-line px-1.5 text-[11px] font-semibold text-ink-2">Open to offers</span>}
      {own ? (
        <p data-own-product className="text-[12.5px] text-ink-2">Your product. <Link href={`/catalog/products?edit=${p.id}`} className="font-bold text-magenta-dark underline underline-offset-4">Edit</Link></p>
      ) : inCartLineId ? (
        <Link href="/cart" className="mt-1 inline-flex min-h-9 items-center justify-center bg-ink px-4 text-[13px] font-semibold text-surface hover:bg-ink-hover">In your Work Request · View</Link>
      ) : p.priceCents == null ? (
        <Link href={`/estimates/request?provider=${p.providerPersonId}&product=${p.id}`} data-request-quote className="mt-1 inline-flex min-h-9 items-center justify-center bg-ink px-4 text-[13px] font-semibold text-surface hover:bg-ink-hover">Request a Quote</Link>
      ) : (
        <div className="mt-1"><BuyButtons productId={p.id} signedIn={signedIn} size="sm" openToOffers={p.openToOffers} pair /></div>
      )}
    </article>
  );
}

function ProductRow({ p, signedIn, own = false, inCartLineId = null }: { p: CardProduct; signedIn: boolean; own?: boolean; inCartLineId?: string | null }) {
  const router = useRouter();
  const { refresh } = useMe();
  const [busy, setBusy] = useState(false);
  const tag = inCartLineId ? "In Your Cart" : p.orders > 0 ? "Popular with Buyers" : p.fresh ? "New" : null;
  const meta = [p.durationWeeks ? `${p.durationWeeks} week${p.durationWeeks === 1 ? "" : "s"}` : null, KIND_LABEL[p.kind] ?? null].filter(Boolean).join(" · ");
  const remove = async () => {
    setBusy(true);
    await fetch("/api/cart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "remove", lineId: inCartLineId }) });
    setBusy(false);
    refresh();
    router.refresh();
  };
  const tone = TONE[p.kind] ?? TONE.DELIVERABLE;
  return (
    <article data-product-card className="grid grid-cols-[72px_1fr] gap-3 border border-line bg-white p-3">
      {/* Uploaded cover first; otherwise the provider's Panameer cover for the type (2026-10-12); older rows keep the code tile. */}
      {p.coverUrl ? (
        <Link href={`/shop/${p.id}`} aria-hidden tabIndex={-1} className="block h-[72px] w-[72px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.coverUrl} alt="" className="h-full w-full object-cover" />
        </Link>
      ) : p.coverStyle || p.typeName ? (
        <Link href={`/shop/${p.id}`} aria-hidden tabIndex={-1} className="block h-[72px] w-[72px]"><DefaultCover typeName={p.typeName} style={p.coverStyle} size={72} /></Link>
      ) : (
        <Link href={`/shop/${p.id}`} aria-hidden tabIndex={-1} className="grid h-[72px] w-[72px] place-items-center text-[20px] font-extrabold text-white/85" style={{ background: `linear-gradient(135deg, ${tone[0]}, ${tone[1]})` }}>
        {code(p)}
        </Link>
      )}
      <div className="min-w-0">
        {tag && <span className="text-[10.5px] font-bold tracking-[0.12em] text-magenta-dark">{tag.toUpperCase()}</span>}
        <h3 className="text-[15px] font-bold leading-snug"><Link href={`/shop/${p.id}`} className="hover:underline">{p.title}</Link></h3>
        {/* Scott 10-17: the short description (up to 120) shows on the card, two lines at most. */}
        {p.summary && <p data-card-summary className="mt-0.5 line-clamp-2 text-[12.5px] leading-snug text-ink-2">{p.summary}</p>}
        <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-ink-2">
          <Link href={`/providers/${p.providerProfileId}`} data-provider-link className="flex min-w-0 items-center gap-1.5 hover:underline">
            <Avatar firstName={p.providerFirst} lastName={p.providerLast} photoUrl={p.providerPhotoUrl} size={22} masked={isMaskedName(p.providerName)} />
            <span className="truncate">{p.providerName}</span>
          </Link>
          {meta && <span className="min-w-0 truncate">· {meta}</span>}
        </p>
        <p className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-2">
          <b className="text-[16px] tabular-nums">{priceLabel(p)}</b>
          {p.terms && <span className="text-[11.5px] text-ink-2">{p.terms}</span>}
        </p>
        {own && (
          <p data-own-product className="mt-2 text-[12.5px] text-ink-2">
            Your Service Product — buyers see Buy Now and Add to Cart here{p.openToOffers ? ", and Make an Offer" : ""}.{" "}
            <Link href={`/catalog/products?edit=${p.id}`} className="font-bold text-magenta-dark underline underline-offset-4">Edit</Link>
          </p>
        )}
        {!own && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {inCartLineId ? (
              <>
                <Link href="/cart" className="inline-flex min-h-9 items-center bg-ink px-4 text-[13px] font-semibold text-surface hover:bg-ink-hover">Checkout</Link>
                <button type="button" disabled={busy} onClick={remove} className="inline-flex min-h-9 items-center border border-ink px-4 text-[13px] font-semibold hover:bg-surface-hover disabled:opacity-40">Remove</button>
              </>
            ) : (
              p.priceCents != null && <BuyButtons productId={p.id} signedIn={signedIn} size="sm" openToOffers={p.openToOffers} />
            )}
          </div>
        )}
      </div>
    </article>
  );
}
