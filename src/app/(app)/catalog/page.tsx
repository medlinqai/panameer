import Link from "next/link";
import { guardPage } from "@/lib/guard";
import { ensureDefaultRates } from "@/lib/build-catalog";
import { catalogHome } from "@/lib/catalog-home";
import { CatalogTabs } from "@/components/catalog/CatalogTabs";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Catalog · Panameer" };

const K = "text-[11px] font-bold tracking-[0.14em]";

// MC-E003: My Catalog › Home (mockup B).
export default async function Page() {
  const viewer = await guardPage("canProvideServices");
  await ensureDefaultRates(viewer).catch(() => null);
  const h = await catalogHome(viewer);
  const done = h.steps.filter((s) => s.done).length;
  return (
    <div className="pm-white-page mx-auto w-full max-w-5xl" data-catalog-home>
      <CatalogTabs current="home" />
      {h.eyebrow && <p className={`${K} text-magenta`}>{h.eyebrow}</p>}
      <h1 className="mt-2 text-[28px] font-extrabold">Your Catalog</h1>
      <p className="max-w-[760px] text-[14px] leading-relaxed text-ink-2">The rates for the services you offer and the prices for the service products you provide.</p>

      <div className="mt-5 grid gap-4 md:grid-cols-[1.25fr_1fr]">
        <section className="border border-line p-[18px]" data-live-now>
          <p className={`${K} text-ink-3`}>LIVE NOW</p>
          <div className="mt-3 flex flex-wrap gap-7">
            <div><b className="block text-[30px] font-extrabold leading-none" data-rates-live>{h.ratesLive}</b><span className="text-[12px] text-ink-3">{`Rates live of ${h.rates.length}`}</span></div>
            <div><b className="block text-[30px] font-extrabold leading-none" data-products-live>{h.productsLive}</b><span className="text-[12px] text-ink-3">Service Products live</span></div>
            <div><b className="block text-[30px] font-extrabold leading-none">{h.waiting}</b><span className="text-[12px] text-ink-3">Cost Estimates waiting on you</span></div>
          </div>
          <p className="mt-4 text-[13px] text-ink-2">Buyers see your catalog on your profile, in Shop and in Work matches.</p>
        </section>
        <section className="border border-ink bg-ink p-[18px] text-white" data-next-step>
          <div className="flex items-center gap-4">
            <div className="grid h-[84px] w-[84px] flex-none place-items-center rounded-full" style={{ background: `conic-gradient(#C93BD0 0 ${(done / 3) * 100}%, #3a3550 ${(done / 3) * 100}% 100%)` }}>
              <i className="grid h-16 w-16 place-items-center rounded-full bg-ink text-[18px] font-extrabold not-italic" data-ring>{`${done}/3`}</i>
            </div>
            <div className="min-w-0">
              <p className={`${K} text-[#B9BDD0]`}>YOUR NEXT STEP</p>
              <b className="block text-[16px]">{h.next ? h.next.title : "Your Catalog Is Live"}</b>
              <span className="text-[12.5px] text-[#B9BDD0]">{h.next ? h.next.sub : "Buyers can find and buy from you now"}</span>
            </div>
          </div>
          <ul className="my-3 text-[13.5px]">
            {h.steps.map((s) => (
              <li key={s.label} className={s === h.next ? "flex items-center gap-2.5 py-1.5 font-bold" : "flex items-center gap-2.5 py-1.5"}>
                <span className={s.done ? "grid h-[18px] w-[18px] flex-none place-items-center border-[1.5px] border-white bg-white text-[11px] text-ink" : s === h.next ? "h-[18px] w-[18px] flex-none border-[1.5px] border-magenta" : "h-[18px] w-[18px] flex-none border-[1.5px] border-[#8a86a0]"}>{s.done ? "✓" : ""}</span>
                {s.label}
              </li>
            ))}
          </ul>
          <Link href={h.next?.href ?? "/profile"} className="inline-flex min-h-10 items-center bg-white px-4 text-[13.5px] font-bold text-ink">{h.next?.cta ?? "View My Profile"}</Link>
        </section>
      </div>

      <div className="mt-7 flex items-baseline justify-between border-t border-line pt-4"><h2 className="text-[17px] font-bold">What&apos;s Live</h2></div>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <section className="border border-line p-3.5" data-tile="services">
          <h3 className="mb-2 flex justify-between text-[14px] font-bold">Services <Link href="/catalog/services" className="text-[12px] text-magenta-dark underline">Edit</Link></h3>
          <ul className="text-[13px]">{h.rates.map((r) => <li key={r.name} className="flex justify-between gap-2 border-t border-[#ECEEF4] py-1.5"><span>{r.name}</span><span className={r.line === "Off" ? "text-ink-3" : ""}>{r.line}</span></li>)}</ul>
        </section>
        <section className="border border-line p-3.5" data-tile="products">
          <h3 className="mb-2 flex justify-between text-[14px] font-bold">Service Products <Link href="/catalog/products#create" className="text-[12px] text-magenta-dark underline">Add</Link></h3>
          {h.products.length ? (
            <ul className="text-[13px]">{h.products.slice(0, 5).map((x) => <li key={x.id} className="flex justify-between gap-2 border-t border-[#ECEEF4] py-1.5"><span className="truncate">{x.title}</span><span className={x.live ? "" : "text-ink-3"}>{x.live ? x.price : "Draft"}</span></li>)}</ul>
          ) : (
            <p className="border border-dashed border-line p-3 text-center text-[13px] text-ink-3">None yet. Reports, dashboards, AI agents, integrations…</p>
          )}
        </section>
        <section className="border border-line p-3.5" data-tile="estimates">
          <h3 className="mb-2 flex justify-between text-[14px] font-bold">Cost Estimates <Link href="/catalog/estimates" className="text-[12px] text-magenta-dark underline">Open</Link></h3>
          <ul className="text-[13px]">
            {([["Received", h.estimates.received], ["Sent", h.estimates.sent], ["Accepted", h.estimates.accepted]] as const).map(([l, n]) => <li key={l} className="flex justify-between border-t border-[#ECEEF4] py-1.5"><span>{l}</span><span>{n}</span></li>)}
          </ul>
        </section>
      </div>
      <p className="mt-6 border-l-2 border-magenta py-1.5 pl-3 text-[13.5px] text-ink-2"><b className="text-ink">Skills</b> tell buyers what you do; your catalog tells them what it costs. Edit skills in <Link href="/profile/edit/skills" className="font-bold text-magenta-dark underline">My Profile › Skills</Link>.</p>
    </div>
  );
}
