import Link from "next/link";
import Image from "next/image";
import { BRAND_DESCRIPTOR } from "@/lib/brand";
import {
  FOOTER_ASSESSMENT,
  FOOTER_GROUPS,
  FOOTER_LEGAL,
  type FooterEntry,
} from "@/components/marketing/brand";

/*
  ⚠ THE LINK TABLE LIVES IN `brand.tsx`, BESIDE `MARKETING_NAV` (E118).

  This footer and `HomeFooter` used to hold two separate tables that disagreed —
  the same label resolving to two different pages. The shells stay different
  because the visual treatments genuinely are (this one is Tailwind on `bg-ink`;
  the home one is the ported `.pm-home` stylesheet with socials). The DATA is
  shared, so they cannot drift again.

  Absolute paths, never bare hashes: a `#pricing` resolves against whatever page
  you are on, which after the rebuild is usually not the page holding the section.
*/

/**
 * ⚠ NO `href` MEANS NO ANCHOR. Not a disabled link, not `href="#"` — plain text
 * with a muted marker. The point of listing what is not built is that a visitor
 * can tell it apart from what is; a link that 404s or goes nowhere is a worse
 * answer than an honest label.
 */
function FooterRow({ entry }: { entry: FooterEntry }) {
  if (!entry.href) {
    return (
      <span className="my-1.5 block text-[14.5px] text-[#8a8199]">
        {entry.label}
        <span className="ml-1.5 align-[1px] text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#6f6880]">
          TBD
        </span>
      </span>
    );
  }
  return (
    <Link
      href={entry.href}
      className="my-1.5 block text-[14.5px] text-[#cfc7da] hover:text-white"
    >
      {entry.label}
    </Link>
  );
}

/* The six index groups, then Legal as the seventh column. */
const COLS = [
  ...FOOTER_GROUPS,
  { title: "Legal", entries: FOOTER_LEGAL },
];

export function MarketingFooter() {
  return (
    <footer className="mt-10 bg-ink py-12 text-[#cfc7da]">
      <div className="mx-auto max-w-[1180px] px-6">
        {/*
          WS-7 — THE TAGLINE UNDER THE WORDMARK IS GONE. It was
          BRAND_DESCRIPTOR, and the copyright row eleven lines below prints the
          same sentence — the footer said the same thing twice, forty pixels
          apart. The copyright row keeps it; that is the line people actually
          read last.

          AND THE GRID IS EVEN NOW. The wordmark sat in a 200px column of its
          own with the tagline under it, and once the tagline went it was a
          32px-tall logo over a large gap while five link columns crowded the
          right. The mark moves to its own row above them, so the five columns
          — Legal included, rather than orphaned — share the width equally.
        */}
        <Image
          src="/brand/panameer-new-on-dark.png"
          alt="Panameer"
          width={529}
          height={134}
          className="mb-9 h-8 w-auto"
        />

        {/*
          SEVEN GROUPS, so the grid goes to four columns at `lg:` rather than
          five — seven across a 1180px row would leave each one too narrow for
          "Post a Work Request" to sit on a line.
        */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
          {COLS.map((col) => (
            <div key={col.title}>
              <b className="mb-2.5 block text-white">{col.title}</b>
              {col.entries.map((e) => (
                <FooterRow key={e.label} entry={e} />
              ))}
              {/* The assessment hangs under Learn — it is the free front door. */}
              {col.title === "Learn" && <FooterRow entry={FOOTER_ASSESSMENT} />}
            </div>
          ))}
        </div>
        <div className="mt-[26px] text-[13px] text-[#8a8199]">
          © 2026 Panameer · {BRAND_DESCRIPTOR}
        </div>
      </div>
    </footer>
  );
}
