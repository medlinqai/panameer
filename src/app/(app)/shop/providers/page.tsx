import Link from "next/link";
import { memberOrPublicTwin } from "@/lib/public-twin";
import { seesTestAccounts } from "@/lib/admin/test-accounts";
import { prisma } from "@/lib/prisma";
import { ShopTabs } from "@/components/shop/ShopTabs";
import { taxonomyV2 } from "@/lib/platform-settings";
import { StoreFilters } from "@/components/shop/StoreFilters";
import { listShopProviders } from "@/lib/shop-providers";
import { categoryGradient, isTalentCategory } from "@/lib/shop-categories";
import { formatCents } from "@/lib/display";
import type { StoreQuery } from "@/lib/shop-filters";

export const dynamic = "force-dynamic";
export const metadata = { title: "Providers · Shop · Panameer" };

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

// SH-E003: trade and business-service companies, open — logo, name, description, city · Category, from $X, View & Buy · Message.
export default async function Page({ searchParams }: { searchParams: Promise<StoreQuery> }) {
  const viewer = await memberOrPublicTwin("/shop");
  const f = await searchParams;
  const seesTest = await seesTestAccounts(viewer);
  const talentPicked = isTalentCategory(f.category);
  const [all, groups] = await Promise.all([
    listShopProviders(seesTest, { q: f.q, delivery: f.delivery }),
    prisma.commodityGroup.findMany({ where: { hidden: false }, orderBy: { sort_order: "asc" }, select: { name: true } }),
  ]);
  const providers = talentPicked ? [] : all.filter((p) => !f.category || p.categories.includes(f.category));
  const categories = groups
    .map((g) => ({ value: g.name, label: g.name, count: isTalentCategory(g.name) ? undefined : all.filter((p) => p.categories.includes(g.name)).length }))
    .filter((c) => c.count == null || c.count > 0 || c.value === f.category);

  return (
    <div className="pm-white-page mx-auto w-full max-w-6xl">
      <ShopTabs services={await taxonomyV2()} />
      <form action="/shop/providers" className="mt-3 flex" role="search">
        <input name="q" defaultValue={f.q ?? ""} placeholder="Search providers…" aria-label="Search providers" className="min-w-0 flex-1 border-2 border-r-0 border-ink bg-white px-3.5 py-2.5 text-[15px]" />
        <button type="submit" className="bg-ink px-5 text-[14px] font-bold text-surface hover:bg-ink-hover">Search</button>
      </form>
      <h1 className="mt-4 text-[24px] font-extrabold">{f.category ?? "Providers"}</h1>
      <p className="text-[14px] text-ink-2">
        Trade and business-service companies. People (consultants, PMs, specialists) are under <Link href="/hire" className="font-bold text-magenta-dark">Hire Talent</Link>.
      </p>
      <div className="mt-3 grid gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
        <StoreFilters base="/shop/providers" f={f} categories={categories} prices={false} />
        {talentPicked ? (
          <div className="rounded-[10px] bg-[#FBEAFB] p-4 text-[14px]" data-talent-callout>
            <b>{f.category} is talent.</b> Tell us who you need, for how long and your budget — we&apos;ll match you and then show you names.
            <Link href="/hire" className="mt-3 flex min-h-10 max-w-[240px] items-center justify-center bg-ink px-4 text-[13.5px] font-bold text-surface hover:bg-ink-hover">Tell us what you need</Link>
          </div>
        ) : providers.length === 0 ? (
          <p className="text-[14px] text-ink-3">No providers match yet.</p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3" data-provider-grid>
            {providers.map((p) => (
              <article key={p.profileId} data-provider-card className="flex gap-3 rounded-[10px] border border-line bg-white p-3.5">
                {p.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.logoUrl} alt="" className="h-[46px] w-[46px] shrink-0 rounded-[10px] object-cover" />
                ) : (
                  <span aria-hidden className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-[10px] text-[15px] font-extrabold text-white" style={{ background: categoryGradient(p.category) }}>{initials(p.company)}</span>
                )}
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <h3 className="text-[15px] font-extrabold leading-snug">{p.company}</h3>
                  {p.description && <p className="line-clamp-2 text-[12.5px] leading-snug text-ink-2">{p.description}</p>}
                  <p className="text-[12px] text-ink-3">{[p.city, p.category].filter(Boolean).join(" · ")}</p>
                  {p.fromCents != null && <p className="mt-auto pt-1 text-[16px] font-extrabold tabular-nums">from {formatCents(p.fromCents, "USD")}<small className="text-[12px] font-medium text-ink-2">{p.fromUnit}</small></p>}
                  <div className="mt-1.5 flex gap-1.5">
                    <Link href={`/providers/${p.profileId}`} className="inline-flex min-h-9 flex-1 items-center justify-center bg-ink px-3 text-[12.5px] font-bold text-surface hover:bg-ink-hover">View &amp; Buy</Link>
                    {p.userId && <Link href={`/messages?with=${p.userId}`} className="inline-flex min-h-9 flex-1 items-center justify-center border border-ink px-3 text-[12.5px] font-bold hover:bg-surface-hover">Message</Link>}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
