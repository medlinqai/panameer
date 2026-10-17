import Link from "next/link";
import { BookOpen, Briefcase, MessageSquareQuote, Tag, Users } from "lucide-react";
import { menuFor, type MenuHint } from "@/lib/menu-hint";
import { MenuClause } from "@/components/home/MenuChip";

// BD-E004: the buyer's five things — one whole-card link each; a magenta icon tile and a small drawn cue that says what's inside.
// DC-E003: titles and "Go to {menu}" buttons; each goes where its menu item goes. Estimates is Shop's My Estimates tab.
type Cue = "people" | "book" | "brief" | "tag" | "quote";
type Thing = { key: string; icon: typeof Users; cue: Cue; title: string; line: string; cta: string; href: string; menu: string };
const THINGS: Thing[] = [
  { key: "connect", icon: Users, cue: "people", title: "Connect with Colleagues", line: "Meet people who buy what you buy, and the colleagues you work with.", cta: "Go to Connect", href: "/connect", menu: "/connect" },
  { key: "learn", icon: BookOpen, cue: "book", title: "Learn from Experts", line: "Free courses on the skills and systems you're buying.", cta: "Go to Learn", href: "/learn", menu: "/learn" },
  { key: "post", icon: Briefcase, cue: "brief", title: "Hire Talent", line: "Tell us who you need, for how long and your budget — we match you.", cta: "Go to Hire", href: "/hire", menu: "/hire" },
  { key: "shop", icon: Tag, cue: "tag", title: "Shop", line: "Products and vendors — business cards to freight — ready to order.", cta: "Go to Shop", href: "/shop", menu: "/shop" },
  { key: "estimate", icon: MessageSquareQuote, cue: "quote", title: "Get an Estimate", line: "Ask a provider for a price on exactly what you need.", cta: "Go to Estimates", href: "/estimates", menu: "/shop" },
];
// Scott 10-15: the seller's four directions in the same card style.
const SELLER_THINGS: Thing[] = [
  { key: "learn", icon: BookOpen, cue: "book", title: "Learn", line: "Free courses and certification tests.", cta: "Go to Learn", href: "/learn", menu: "/learn" },
  { key: "connect", icon: Users, cue: "people", title: "Connect", line: "Find colleagues and mentors.", cta: "Go to Connect", href: "/connect/community", menu: "/connect/community" },
  { key: "services", icon: Briefcase, cue: "brief", title: "Sell My Services", line: "Browse open work and get invited to propose.", cta: "Go to Jobs", href: "/find-work", menu: "/find-work" },
  { key: "products", icon: Tag, cue: "tag", title: "Sell Service Products", line: "List a fixed-price package buyers can order.", cta: "Go to My Catalog", href: "/catalog/products", menu: "/catalog/products" },
];

/** Small line drawings in brand ink and magenta — decorative, hidden from screen readers. */
function Cue({ kind }: { kind: Cue }) {
  const ink = "#272334";
  const mg = "#d72cd6";
  const common = { width: 72, height: 44, viewBox: "0 0 72 44", "aria-hidden": true, className: "shrink-0" } as const;
  if (kind === "people")
    return (
      <svg {...common}>
        {[0, 1, 2].map((i) => (
          <g key={i} transform={`translate(${8 + i * 18} 6)`}>
            <circle cx="12" cy="12" r="12" fill={i === 1 ? mg : "#fff"} stroke={ink} strokeWidth="1.5" />
            <circle cx="12" cy="9.5" r="4" fill={i === 1 ? "#fff" : ink} />
            <path d="M5 20c1.6-3.6 4-5 7-5s5.4 1.4 7 5" fill="none" stroke={i === 1 ? "#fff" : ink} strokeWidth="1.5" />
          </g>
        ))}
      </svg>
    );
  if (kind === "book")
    return (
      <svg {...common}>
        <path d="M14 10c7-3 14-3 22 1v26c-8-4-15-4-22-1z" fill="#fff" stroke={ink} strokeWidth="1.5" />
        <path d="M58 10c-7-3-14-3-22 1v26c8-4 15-4 22-1z" fill="#fff" stroke={ink} strokeWidth="1.5" />
        <path d="M19 17h11M19 22h11M41 17h12M41 22h8" stroke={mg} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  if (kind === "brief")
    return (
      <svg {...common}>
        <rect x="14" y="13" width="44" height="26" rx="3" fill="#fff" stroke={ink} strokeWidth="1.5" />
        <path d="M28 13V9a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v4" fill="none" stroke={ink} strokeWidth="1.5" />
        <path d="M14 23h44" stroke={ink} strokeWidth="1.5" />
        <rect x="32" y="20" width="8" height="6" rx="1.5" fill={mg} />
      </svg>
    );
  if (kind === "tag")
    return (
      <svg {...common}>
        <path d="M14 8h22l20 20-16 16-20-20z" fill="#fff" stroke={ink} strokeWidth="1.5" strokeLinejoin="round" />
        <circle cx="24" cy="18" r="3.5" fill={mg} />
        <path d="M33 30l6-6M37 34l6-6" stroke={ink} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  return (
    <svg {...common}>
      <path d="M10 8h40a4 4 0 0 1 4 4v16a4 4 0 0 1-4 4H26l-9 7v-7h-7a4 4 0 0 1-4-4V12a4 4 0 0 1 4-4z" fill="#fff" stroke={ink} strokeWidth="1.5" strokeLinejoin="round" />
      <text x="30" y="25" textAnchor="middle" fontSize="12" fontWeight="800" fill={mg}>$ ?</text>
    </svg>
  );
}

// Phone 1 column · tablet 2 · desktop 3 + 2 (five abreast squeezes these titles to four lines).
const SPAN = ["lg:col-span-2", "lg:col-span-2", "lg:col-span-2", "lg:col-span-3", "sm:col-span-2 lg:col-span-3"];

export function BuyerThings({ seller = false }: { seller?: boolean } = {}) {
  const items = seller ? SELLER_THINGS : THINGS;
  const hintFor = (menu: string): MenuHint | null => menuFor(menu, seller ? "seller" : "buyer");
  return (
    <ul data-buyer-things={seller ? undefined : true} data-seller-things={seller || undefined} className={"mt-4 grid gap-4 sm:grid-cols-2 " + (seller ? "lg:grid-cols-4" : "lg:grid-cols-6")}>
      {items.map((t, i) => {
        const I = t.icon;
        return (
          <li key={t.key} className={seller ? "" : SPAN[i]}>
            <Link
              href={t.href}
              data-thing={t.key}
              className="group flex h-full flex-col rounded-[14px] border border-line bg-surface p-6 transition-[transform,border-color,box-shadow] duration-200 hover:border-ink hover:shadow-[0_10px_24px_-14px_rgba(39,35,52,0.45)] focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink motion-safe:hover:-translate-y-0.5"
            >
              <span className="flex items-start justify-between gap-3">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-[12px] bg-magenta/10 text-magenta-dark">
                  <I className="h-7 w-7" aria-hidden strokeWidth={1.75} />
                </span>
                <Cue kind={t.cue} />
              </span>
              <b className="mt-5 block text-[18px] font-extrabold leading-snug text-ink">{t.title}</b>
              <span className="mt-2 block flex-1 text-[14.5px] leading-relaxed text-ink-2">
                {t.line}
                <MenuClause hint={hintFor(t.menu)} />
              </span>
              <span className="mt-5 inline-flex min-h-[44px] items-center self-start bg-ink px-5 text-[14px] font-bold text-surface transition-colors group-hover:bg-magenta-dark">{hintFor(t.menu) ? `Go to ${hintFor(t.menu)!.label}` : t.cta}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
