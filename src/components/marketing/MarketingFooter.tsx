import Link from "next/link";
import Image from "next/image";
import { BRAND_DESCRIPTOR } from "@/lib/brand";
import { FOOTER_LEGAL } from "@/components/marketing/brand";
import {
  FOOTER_SOCIALS,
  FOOTER_VIDEO_COLUMNS,
} from "@/components/marketing/footer-videos";

/**
 * ── ⚠⚠ THE FOOTER, REBUILT TO SCOTT'S LAYOUT (`P1-ALL-E020`) ────────────────
 *
 * ONE component, SEVEN public pages — `/`, `/learn`, `/optimize`, `/talent`,
 * `/find-work`, `/shop`, `/integrate` (plus `/why-panameer` and `/explore`).
 * `HomeFooter` is retired and stays on disk unimported (`E164`).
 *
 * ⚠ THIS IS A REBUILD, NOT A CONTENT SWAP. The structure INVERTS from what
 * `brief_walk_fixes` WS9 shipped, and the brief's own table is why:
 *
 *     brand block   was ABOVE the columns, top-left   ->  BELOW them, own band
 *     columns       five dense nav lists              ->  three wide video columns
 *     headings      tiny letterspaced ALL-CAPS        ->  sentence case, display face
 *     TBD badges    present                           ->  GONE ENTIRELY
 *     About/etc     a stacked column of links         ->  one right-aligned pipe row
 *     socials       one YouTube button                ->  a row of inline SVG icons
 *     legal         a small line in the body          ->  a full-width bar, own surface
 *
 * ⚠ THE FIVE WS9 SECTIONS ARE RETIRED — SELLER/BUYER/Panameer/AI Platform
 * Solutions. `FOOTER_GROUPS` in `brand.tsx` is now unreferenced by this file;
 * it is left in place rather than deleted, because `E164` and because nothing
 * else in this brief owns that constant.
 *
 * ── ⚠ THE TYPE SCALE IS THE SITE'S, WITH ONE SUBSTITUTION, REPORTED ────────
 *
 * The footer's own sizes were 14.5px (rows), 13px (legal) and 10.5px (the TBD
 * marker, now gone). Scott's column headings are *"sentence case, display face,
 * roughly body-size-up"* and the footer had NOTHING above 14.5px.
 * ⚠ SO THE HEADINGS USE `17px`, WHICH IS THE SITE'S EXISTING NEXT SIZE UP
 * (`/optimize`'s hero CTA, `/learn`'s sub-copy at ≤900). NO NEW SIZE WAS
 * INVENTED. Reported as a substitution.
 *
 * ── ⚠⚠ COLOUR: NOT TOUCHED, EXCEPT ONE TEXT COLOUR THE GATE FORCED ─────────
 *
 * The surface stays `bg-ink` = `#181E3C`, the brand deck's navy, landed in
 * `7668110`. Scott: *"the color still looks wrong, not my slate color."* ⚠ THE
 * BRIEF SAYS REPORT, NOT REPAINT, and the computed hex of all three bands is in
 * the report.
 *
 * ⚠ THE ONE EXCEPTION IS A TEXT COLOUR, AND THE BRIEF'S OWN AA GATE IS WHY.
 * `#8a8199` — the legal row — measures **4.40:1** on the navy and AA needs 4.5.
 * It is a PRE-EXISTING failure, 0.10 short, and shipping it would fail the gate
 * this brief sets. It became `#9a92a8`, the smallest step in the
 * same hue that passes. ⚠ AND ITS BACKGROUND CHANGED AGAIN ON 2026-08-25 when the
 * legal bar's `bg-black/20` tint was removed — so the ratio was re-measured on the
 * flat navy rather than carried over. See the note on band 3.
 */

/** ⚠ `currentColor`, so the icon recolours with the link on hover. */
function SocialIcon({ path }: { path: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="currentColor"
      aria-hidden
      focusable="false"
    >
      <path d={path} />
    </svg>
  );
}

/*
  ⚠ THE RIGHT-HAND ROW. `Why Panameer` is the ONLY one of the four with a page;
  the other three render as plain text, which is the footer's standing rule —
  no href, no anchor. ⚠ NO `TBD` MARKER: these sit inline in a pipe-separated
  row, where a badge per item would be unreadable.
*/
const BAND2_LINKS: { label: string; href?: string }[] = [
  { label: "About Us" },
  { label: "Contact Us" },
  { label: "Why Panameer", href: "/why-panameer" },
  { label: "Pricing" },
];

export function MarketingFooter() {
  return (
    <footer className="mt-10 bg-ink text-[#cfc7da]">
      {/* ══ BAND 1 — the three video columns, the footer's dominant element ══ */}
      <div className="mx-auto max-w-[1180px] px-6 pb-11 pt-12">
        {/*
          ⚠ GENEROUS GUTTERS ON PURPOSE (`gap-x-14`). Scott's mockup spreads three
          columns across the full measure; this is not a dense nav block. Three at
          `min-[901px]` — the site's breakpoint, not Tailwind's — two above 640, one
          below.

          ⚠ BOTH TIERS ARE ARBITRARY `min-[]` VARIANTS AND THAT IS REQUIRED, NOT A
          STYLE CHOICE. `check:app-shell` GUARD 3 forbids a named breakpoint and an
          arbitrary one competing for the same property, and it caught the first cut
          (`sm:grid-cols-2` against `min-[901px]:grid-cols-3`) — `sm` is 640px, so
          the two tiers were fighting over `grid-cols` in different systems.
        */}
        <div className="grid grid-cols-1 gap-x-14 gap-y-10 min-[640px]:grid-cols-2 min-[901px]:grid-cols-3">
          {FOOTER_VIDEO_COLUMNS.map((col) => (
            <div key={col.title}>
              <h2 className="mb-3.5 font-display text-[17px] font-bold leading-[1.3] text-white">
                {col.title}
              </h2>
              {/*
                ⚠ A `<ul>`, AND EVERY ITEM IS A `<li>` OF PLAIN TEXT. No anchors
                anywhere in this band — `FooterVideoColumn` has no `href` field, so
                a destination cannot be added without changing the type.
              */}
              <ul>
                {col.items.map((item) => (
                  <li
                    key={item}
                    className="my-1.5 text-[14.5px] leading-[1.45]"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* ══ BAND 2 — brand block left, the four-item row right ══════════════ */}
      {/* ⚠ DIVIDED FROM BAND 1 BY A RULE, per the brief's "each visually separated". */}
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-8 px-6 py-9 min-[901px]:flex-row min-[901px]:items-start min-[901px]:justify-between">
          <div>
            <Image
              src="/brand/panameer-new-on-dark.png"
              alt="Panameer"
              width={529}
              height={134}
              className="h-8 w-auto"
            />
            {/* ⚠ EN DASH and `&`, both as Scott typed them. */}
            <p className="mt-3 max-w-[560px] text-[14.5px] leading-[1.5]">
              The home of Oracle application &amp; AI specialists &ndash; and
              the businesses that need them.
            </p>
            {/*
              ⚠ THE ICON ROW REPLACES THE SINGLE YOUTUBE BUTTON — both do not ship.
              ⚠ `aria-label` ON EVERY ONE: an icon-only link with no accessible
              name is a `check:ui` failure, not a cosmetic issue.
              ⚠ NO WHATSAPP — no destination given. Asked for in the report.
            */}
            <div className="mt-4 flex items-center gap-4">
              {FOOTER_SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="text-[#cfc7da] transition-colors hover:text-white"
                >
                  <SocialIcon path={s.path} />
                </a>
              ))}
            </div>
          </div>

          {/*
            ⚠ ONE HORIZONTAL PIPE-SEPARATED ROW, RIGHT-ALIGNED, baseline-aligned
            with the logo — not a stacked column. The separator is a real `<span>`
            rather than a CSS pseudo-element so it can be `aria-hidden`.
          */}
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 text-[14.5px] min-[901px]:justify-end">
            {BAND2_LINKS.map((e, i) => (
              <span key={e.label} className="flex items-center gap-x-2.5">
                {i > 0 && (
                  <span aria-hidden className="text-white/40">
                    |
                  </span>
                )}
                {e.href ? (
                  <Link href={e.href} className="hover:text-white">
                    {e.label}
                  </Link>
                ) : (
                  <span>{e.label}</span>
                )}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ══ BAND 3 — the legal bar. ⚠ CONTENT AND LINKS UNCHANGED ═══════════ */}
      {/*
        ── ⚠⚠ SEPARATION IS A HAIRLINE, NOT A SURFACE (2026-08-25) ─────────────

        This band shipped with `bg-black/20`, which composited to `#131830` over the
        navy. ⚠ SCOTT: all three bands are the brand navy `#181E3C` — nothing
        tinted, nothing darkened, nothing lightened. So the tint is GONE and band 3
        now carries the SAME `border-t border-white/10` that already divides bands 1
        and 2. One separation treatment for both seams.

        ⚠ THE TEXT RATIO MOVED WITH IT and was re-measured, not assumed: `#9a92a8`
        was sitting on the darker composited bar at 5.87:1 and now sits on the navy.
        The new figure is in the report.
        ⚠ `2026 Panameer`, NO `©` GLYPH, first item. Scott's wording.
        ⚠ ITEMS SPREAD ACROSS THE WIDTH, not bunched left.
      */}
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 py-4 text-[13px] text-[#9a92a8]">
          <span>2026 Panameer</span>
          {FOOTER_LEGAL.map((e) =>
            e.href ? (
              <Link key={e.label} href={e.href} className="hover:text-white">
                {e.label}
              </Link>
            ) : (
              <span key={e.label}>{e.label}</span>
            ),
          )}
          {/*
            ⚠ `BRAND_DESCRIPTOR` STAYS IN THE LEGAL BAR. It was the second half of
            the old copyright line and Scott said he likes this row; dropping it
            would be a content change to the one band he asked to leave alone.
          */}
          <span className="text-[#9a92a8]">{BRAND_DESCRIPTOR}</span>
        </div>
      </div>
    </footer>
  );
}
