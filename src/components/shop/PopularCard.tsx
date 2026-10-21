import Link from "next/link";
import type { ShopProduct } from "@/lib/shop";
import { TypeArt } from "@/components/shop/TypeArt";
import { NeutralAvatar, Avatar, isMaskedName } from "@/components/Avatar";
import { priceLabel } from "@/components/shop/ProductCard";

// PA-E002/E005: a Popular card — the Product Type art band, then name, type, price and the seller
// (provider number + neutral avatar until a Work Order with this buyer is Released).
export function PopularCard({ p }: { p: ShopProduct }) {
  const masked = isMaskedName(p.providerName);
  return (
    <Link href={`/shop/${p.id}`} className="flex flex-col overflow-hidden rounded-[12px] border border-line bg-white hover:border-magenta" data-popular-card>
      <TypeArt typeName={p.typeName} category={p.category} size="band" className="rounded-none" />
      <span className="flex flex-1 flex-col gap-1 p-3">
        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-magenta-dark">{p.typeName ?? p.category ?? "Product"}</span>
        <b className="line-clamp-2 text-[14.5px] leading-snug">{p.title}</b>
        <b className="text-[15px] tabular-nums">{priceLabel(p)}</b>
        <span className="mt-auto flex items-center gap-1.5 pt-1 text-[12.5px] text-ink-2" data-card-seller>
          {masked ? <NeutralAvatar size={20} /> : <Avatar firstName={p.providerFirst} lastName={p.providerLast} photoUrl={p.providerPhotoUrl} size={20} />}
          <span className="truncate">{masked ? p.providerName : p.companyName || p.providerName}</span>
        </span>
      </span>
    </Link>
  );
}
