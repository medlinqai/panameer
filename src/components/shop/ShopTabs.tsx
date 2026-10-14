"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PageTabs } from "@/components/casing/PageTabs";
import { useMe } from "@/components/MeProvider";

// WS-E004: SHOP | Service Products · My Estimates · Cart (count), and a black Sell on Panameer menu at the right.
export function ShopTabs({ services = false }: { services?: boolean } = {}) {
  const pathname = usePathname() ?? "";
  const { me } = useMe();
  const cart = me?.cartCount ?? 0;
  const current = pathname.startsWith("/cart") ? "/cart" : pathname.startsWith("/estimates") ? "/estimates" : pathname.startsWith("/shop/services") ? "/shop/services" : "/shop";
  // GT-E005: Services tab only while taxonomy_v2 is on (the server page passes it).
  const tabs = [
    { label: "Service Products", href: "/shop" },
    ...(services ? [{ label: "Services", href: "/shop/services" }] : []),
    { label: "My Estimates", href: "/estimates" },
    { label: "Cart", href: "/cart", badge: cart },
  ];
  return (
    <PageTabs wrap eyebrow="Shop" tabs={tabs} current={current}>
      <SellMenu sells={!!me?.person?.roles?.isServiceProvider} />
    </PageTabs>
  );
}

function SellMenu({ sells }: { sells: boolean }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", off);
    return () => document.removeEventListener("mousedown", off);
  }, [open]);
  const BTN = "inline-flex min-h-10 items-center gap-1.5 bg-ink px-4 text-[13.5px] font-semibold text-surface hover:bg-ink-hover";
  if (!sells) return <Link href="/join/provider" data-sell-on-panameer className={BTN}>Sell on Panameer</Link>;
  return (
    <div ref={box} className="relative">
      <button type="button" data-sell-on-panameer aria-expanded={open} onClick={() => setOpen((o) => !o)} className={BTN}>
        Sell on Panameer <span aria-hidden>▾</span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-1 w-[280px] border border-line bg-white shadow-lg">
          <Link role="menuitem" href="/catalog/products/new" className="block border-b border-line px-4 py-3 hover:bg-surface-hover">
            <b className="block text-[14px]">Add a Service Product</b>
            <span className="text-[12.5px] text-ink-2">A fixed-price offer buyers can buy now</span>
          </Link>
          <Link role="menuitem" href="/catalog/estimates/new" className="block px-4 py-3 hover:bg-surface-hover">
            <b className="block text-[14px]">Create an Estimate</b>
            <span className="text-[12.5px] text-ink-2">A custom quote for one customer</span>
          </Link>
        </div>
      )}
    </div>
  );
}
