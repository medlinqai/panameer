import Link from "next/link";
import { STORE_BILLING, STORE_DELIVERY, STORE_PRICE, storeHref, type StoreQuery } from "@/lib/shop-filters";

// SH2-E003: e-procurement style filters on the left (a collapsible block on phones). Every option is a link; the URL holds the state.
type Opt = { value: string; label: string; count?: number };
export function StoreFilters({ base, f, categories }: { base: string; f: StoreQuery; categories: Opt[] }) {
  const body = (
    <div className="text-[13.5px]" data-store-filters>
      <Group title="Category">
        <Row href={storeHref(base, f, "category", null)} on={!f.category} label="All" radio />
        {categories.map((c) => <Row key={c.value} href={storeHref(base, f, "category", c.value)} on={f.category === c.value} label={c.label} count={c.count} radio />)}
      </Group>
      <Group title="Price">
        {STORE_PRICE.map((o) => <Row key={o.value} href={storeHref(base, f, "price", o.value)} on={f.price === o.value} label={o.label} />)}
      </Group>
      <Group title="Billing">
        {STORE_BILLING.map((o) => <Row key={o.value} href={storeHref(base, f, "billing", o.value)} on={f.billing === o.value} label={o.label} />)}
      </Group>
      <Group title="Delivery">
        {STORE_DELIVERY.map((o) => <Row key={o.value} href={storeHref(base, f, "delivery", o.value)} on={f.delivery === o.value} label={o.label} />)}
      </Group>
      <Group title="Offers">
        <Row href={storeHref(base, f, "offers", "1")} on={f.offers === "1"} label="Open to Offers" />
      </Group>
    </div>
  );
  return (
    <>
      <aside className="hidden md:block">{body}</aside>
      <details className="border border-line bg-white px-3 py-2 md:hidden">
        <summary className="cursor-pointer text-[14px] font-bold">Filters</summary>
        {body}
      </details>
    </>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-3">
      <h3 className="mb-1.5 mt-3.5 text-[11px] font-bold uppercase tracking-[0.1em] text-ink-3">{title}</h3>
      {children}
    </section>
  );
}

function Row({ href, on, label, count, radio = false }: { href: string; on: boolean; label: string; count?: number; radio?: boolean }) {
  return (
    <Link href={href} scroll={false} aria-current={on ? "true" : undefined} className="flex items-center gap-2 py-[3px] hover:underline">
      <span aria-hidden className={radio ? (on ? "h-3.5 w-3.5 shrink-0 rounded-full border-[4px] border-ink" : "h-3.5 w-3.5 shrink-0 rounded-full border border-ink-3") : on ? "grid h-3.5 w-3.5 shrink-0 place-items-center bg-ink text-[9px] font-bold text-white" : "h-3.5 w-3.5 shrink-0 border border-ink-3"}>{!radio && on ? "✓" : ""}</span>
      <span className={on ? "font-bold" : ""}>{label}</span>
      {count != null && <span className="ml-auto text-[12px] text-ink-3">{count}</span>}
    </Link>
  );
}
