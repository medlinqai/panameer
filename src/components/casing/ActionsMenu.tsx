import Link from "next/link";

/** DB-E006: a plain "Actions ▾" menu (no JS) — links only. */
export function ActionsMenu({ items }: { items: { label: string; href: string }[] }) {
  if (!items.length) return null;
  return (
    <details className="relative [&_summary::-webkit-details-marker]:hidden" data-actions-menu>
      <summary className="inline-flex min-h-10 cursor-pointer list-none items-center border border-ink bg-white px-4 text-[13.5px] font-semibold hover:bg-bg-soft">Actions ▾</summary>
      <ul className="absolute left-0 z-30 sm:left-auto sm:right-0 mt-1 w-56 max-w-[calc(100vw-32px)] rounded-[10px] border border-line bg-white py-1 shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
        {items.map((i) => <li key={i.href + i.label}><Link href={i.href} className="block px-3.5 py-2 text-[13.5px] hover:bg-bg-soft">{i.label}</Link></li>)}
      </ul>
    </details>
  );
}
