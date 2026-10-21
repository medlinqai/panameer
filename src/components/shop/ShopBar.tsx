"use client";

import { useState } from "react";

// SA-E003: [Search products…] [Category ▾] [Product Type ▾] [Search] — Product Type follows the Category (Category Hierarchy).
export function ShopBar({ q, category, type, categories, types }: { q: string; category: string; type: string; categories: string[]; types: Record<string, { id: string; name: string }[]> }) {
  const [cat, setCat] = useState(category);
  const [t, setT] = useState(type);
  const options = cat ? types[cat] ?? [] : [];
  return (
    <form action="/shop" role="search" data-shop-search className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:gap-0">
      <input type="hidden" name="tab" value="browse" />
      <input name="q" defaultValue={q} placeholder="Search products…" aria-label="Search products" className="col-span-2 min-w-0 border-2 border-ink bg-white px-3.5 py-3 text-[15px] sm:flex-1 sm:border-r-0" />
      <select name="category" value={cat} onChange={(e) => { setCat(e.target.value); setT(""); }} aria-label="Category" className="min-w-0 border-2 border-ink bg-white px-2.5 py-3 text-[14px] sm:max-w-[200px] sm:border-r-0">
        <option value="">All categories</option>
        {categories.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <select name="type" value={t} onChange={(e) => setT(e.target.value)} aria-label="Product Type" disabled={!options.length} className="min-w-0 border-2 border-ink bg-white px-2.5 py-3 text-[14px] disabled:text-ink-3 sm:max-w-[200px] sm:border-r-0" data-product-type>
        <option value="">{cat ? (options.length ? "All product types" : "No product types") : "Product type"}</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
      <button type="submit" className="col-span-2 bg-ink px-6 py-3 text-[14px] font-bold text-surface hover:bg-ink-hover">Search</button>
    </form>
  );
}
