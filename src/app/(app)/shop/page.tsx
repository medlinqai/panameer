import Link from "next/link";
import { memberOrPublicTwin } from "@/lib/public-twin";
import { listShopProducts, newThisWeek } from "@/lib/shop";
import { seesTestAccounts } from "@/lib/admin/test-accounts";
import { prisma } from "@/lib/prisma";
import { ShopTabs } from "@/components/shop/ShopTabs";
import { taxonomyV2 } from "@/lib/platform-settings";
import { ProductCard } from "@/components/shop/ProductCard";
import { CategoryIcon } from "@/components/shop/CategoryIcon";
import { categoryGradient, categoryLook, isTalentCategory } from "@/lib/shop-categories";

export const dynamic = "force-dynamic";
export const metadata = { title: "Shop · Panameer" };

// SH-E001: Shop Home — one search, a picture tile per Category (→ Products in that Category), New this week.
export default async function Page() {
  const viewer = await memberOrPublicTwin("/shop");
  const [all, me, groups] = await Promise.all([
    listShopProducts(undefined, await seesTestAccounts(viewer)),
    prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { id: true } }),
    prisma.commodityGroup.findMany({ where: { hidden: false }, orderBy: { sort_order: "asc" }, select: { name: true } }),
  ]);
  const products = all;
  const count = (name: string) => products.filter((p) => p.category === name).length;
  const fresh = newThisWeek(products);

  return (
    <div className="pm-white-page mx-auto w-full max-w-6xl">
      <ShopTabs services={await taxonomyV2()} />
      <form action="/shop/products" className="mt-3 flex" role="search" data-shop-search>
        <input name="q" placeholder="Search Panameer — business cards, HVAC tune-up, P2P health check…" aria-label="Search products and providers" className="min-w-0 flex-1 border-2 border-r-0 border-ink bg-white px-3.5 py-3 text-[15px]" />
        <button type="submit" className="bg-ink px-6 text-[14px] font-bold text-surface hover:bg-ink-hover">Search</button>
      </form>
      <h1 className="mt-5 text-[26px] font-extrabold">Shop</h1>
      <p className="text-[14px] text-ink-2">
        Things with a price, and vendors you can shop openly. Looking to post your job? <Link href="/hire" className="font-bold text-magenta-dark">Hire Talent →</Link>
      </p>
      <div className="mt-3.5 grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-3" data-category-tiles>
        {groups.map((g) => {
          const look = categoryLook(g.name);
          const n = count(g.name);
          return (
            <Link key={g.name} href={`/shop/products?category=${encodeURIComponent(g.name)}`} data-category-tile={g.name} className="relative flex h-[150px] items-end overflow-hidden rounded-[10px] p-3.5 text-white focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-magenta" style={{ background: categoryGradient(g.name) }}>
              <CategoryIcon icon={look.icon} className="absolute right-3 top-3 h-11 w-11 opacity-90" />
              <span className="text-[16px] font-extrabold leading-tight">
                {g.name}
                <small className="block text-[12px] font-medium opacity-85">
                  {look.examples}
                  {isTalentCategory(g.name) ? " · talent under Hire" : ""}
                </small>
                <small className="block text-[11.5px] font-semibold opacity-75">{n ? `${n} product${n === 1 ? "" : "s"}` : "Coming soon"}</small>
              </span>
            </Link>
          );
        })}
      </div>
      <h2 className="mb-2.5 mt-7 text-[18px] font-bold">New this week</h2>
      {fresh.length === 0 ? (
        <p className="text-[14px] text-ink-2">No products are published yet.</p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-3" data-new-this-week>
          {fresh.map((p) => <ProductCard key={p.id} p={p} tile signedIn own={p.providerPersonId === me?.id} />)}
        </div>
      )}
    </div>
  );
}
