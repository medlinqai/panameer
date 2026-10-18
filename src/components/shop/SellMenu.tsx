"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useMe } from "@/components/MeProvider";

// SH2-E003: the black "Sell on Panameer" button / menu at the right of the Shop header.
export function SellOnPanameer() {
  const { me } = useMe();
  return <SellMenu sells={!!me?.person?.roles?.isServiceProvider} />;
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
