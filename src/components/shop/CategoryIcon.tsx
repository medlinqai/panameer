import type { CategoryIconKey } from "@/lib/shop-categories";

// SH2-E001: one magenta line icon per Day-1 Category (from the approved mockup).
const PATHS: Record<CategoryIconKey, React.ReactNode> = {
  erp: <path d="M3 5h18v14H3zM3 10h18M8 10v9" />,
  print: <path d="M6 9V3h12v6M6 18H4v-7h16v7h-2M7 14h10v7H7z" />,
  mkt: <path d="M3 11v2l13 5V6zM16 9a3 3 0 0 1 0 6M6 13l1 6h3l-1-5" />,
  web: <path d="M3 5h18v14H3zM3 9h18M7 7h.01M10 7h.01" />,
  ai: <><rect x="5" y="7" width="14" height="11" rx="3" /><path d="M12 3v4M9 12h.01M15 12h.01M9 15h6" /></>,
  fin: <path d="M4 20h16M6 16V9M10 16V5M14 16v-6M18 16V8" />,
  it: <><path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z" /><path d="M9 12l2 2 4-4" /></>,
  truck: <path d="M2 6h12v10H2zM14 10h4l4 4v2h-8M6 19a2 2 0 1 0 0-.1M18 19a2 2 0 1 0 0-.1" />,
  fac: <path d="M3 11l9-7 9 7M5 10v10h14V10M10 20v-6h4v6" />,
  exp: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" /></>,
  lead: <path d="M3 4h18l-7 8v6l-4 2v-8z" />,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17h.01" /></>,
};

export function CategoryIcon({ icon, className }: { icon: CategoryIconKey; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      {PATHS[icon]}
    </svg>
  );
}
