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
  /*
    ⚠ OFF-SITE LINKS ARE PLAIN `<a>`, NOT `<Link>`, and they carry
    `rel="noopener noreferrer"` with `target="_blank"` (WS9). `next/link` is for
    in-app navigation; handing it an absolute external URL works but prefetches
    and client-routes something that is not ours.
  */
  if (entry.external) {
    return (
      <a
        href={entry.href}
        target="_blank"
        rel="noopener noreferrer"
        className="my-1.5 block text-[14.5px] text-[#cfc7da] hover:text-white"
      >
        {entry.label}
      </a>
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

/*
  ⚠ FIVE SECTIONS + LEGAL = SIX COLUMNS (WS9). It was seven; `Hire`, `Work` and
  `Learn` were removed for duplicating the header, and Scott's five replace the
  other three. ⚠ THE LEGAL COLUMN AND THE BOTTOM COPYRIGHT ROW ARE UNTOUCHED —
  Scott: *"i like the row on the bottom for legal...where the copyright is."*
*/
const COLS = [...FOOTER_GROUPS, { title: "Legal", entries: FOOTER_LEGAL }];

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
          className="h-8 w-auto"
        />
        {/*
          ── ⚠⚠ THE TAGLINE, VERBATIM (WS9) ──────────────────────────────────

          It replaces `Learn. Connect. Create. Settle. Together.` — the four-verb
          lockup, whose public call sites were removed by `P1-J1-E019` and
          `P1-J4-E009`. ⚠ `BRAND_BADGE_SHORT` STAYS IN `brand.ts`; only this site
          changes.

          ⚠ EN DASH (–), NOT A HYPHEN, AND `&` NOT `and` — both as Scott typed it.
          ⚠ THE COMMENT ABOVE THIS BLOCK USED TO SAY THE TAGLINE WAS REMOVED
          because the copyright row printed the same sentence. That is no longer
          true: this is a DIFFERENT sentence from `BRAND_DESCRIPTOR`, so the footer
          no longer says one thing twice.
        */}
        <p className="mb-9 mt-3 max-w-[560px] text-[14.5px] leading-[1.5] text-[#cfc7da]">
          The home of Oracle application &amp; AI specialists &ndash; and the
          businesses that need them.
        </p>

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
              {/*
                ⚠ THE ASSESSMENT HANGS UNDER THE BUYER COLUMN NOW. It used to hang
                under `Learn`, and that column is gone (WS9). It is the free front
                door and `E119` exists because two links labelled for the
                assessment both missed it — so it keeps a home rather than being
                dropped with the column.
              */}
              {col.title === "Service BUYER Features" && (
                <FooterRow entry={FOOTER_ASSESSMENT} />
              )}
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
