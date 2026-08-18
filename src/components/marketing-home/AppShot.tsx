import {
  AlignLeft,
  BarChart3,
  Bell,
  FileText,
  LayoutGrid,
  LifeBuoy,
  PenLine,
  Search,
  Settings,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

/**
 * THE SHARED APP SHELL FOR THE SPINE'S PRODUCT SHOTS — browser frame, rail, top bar.
 *
 * Steps 2, 4 and 5 all draw the same chrome around different bodies. This is that
 * chrome, once. Three hand-copied shells would be three places for the rail to
 * drift, which is the argument `spine-steps.ts` already makes about the sections
 * themselves: the thing that repeats becomes data, not another file.
 *
 * ── ⚠ MARKETING ART, NOT THE PRODUCT ─────────────────────────────────────────
 *
 * This imports nothing from the real app shell (`casing/`), and must not. `/`
 * prerenders static with no session, the real rail is driven by
 * `menuForUserClass()` off a viewer, and the real surface is under active change.
 * A drawing that tracked it would break on every commit to it. An approved
 * drawing is honestly a drawing; a stale screenshot claims to be the thing.
 *
 * ── ⚠ NO INLINE GEOMETRY IN HERE, DELIBERATELY (the E152 lesson) ─────────────
 *
 * E152 cost two extra fixes because `.fnl-procs` had `grid-template-rows` set
 * inline by its component and `.fnl` pinned a row to `--fnl-h`: an inline style
 * beats every selector, so no media query could release either, and the phone
 * layout could not be written at all until the values moved to inline CUSTOM
 * PROPERTIES that home.css reads for desktop and overrides at the breakpoint.
 *
 * Three sections share this shell, so the same mistake here would be three times
 * as expensive. Every dimension in the chrome lives in home.css where a media
 * query can reach it. The only inline values are the three traffic-light colours,
 * which are paint and not geometry.
 *
 * ── ICONS ARE `lucide-react`, NOT A `<defs>` SYMBOL BLOCK ─────────────────────
 *
 * The brief asks for the mockups' inline `<defs>` + `<use href="#i-grid">`. The
 * requirement behind that is "inline SVG, never unicode glyphs" — `▦ ◔ ▤ ◈ ⚙`
 * fail to render on about half the boxes tested — and lucide satisfies it while
 * being the project's existing approach (`casing/RailIcon.tsx` maps names to this
 * same package). It also avoids putting a dozen global ids into a page that
 * renders other SVGs, and only the named icons are bundled. Step 4 shipped this
 * way at f5d6fed; this keeps all three consistent rather than mixing two schemes.
 * lucide carries no `"use client"`, so these stay Server Components.
 */

/**
 * The rail's five "General" tiles. `railActive` indexes THIS list, so a shot says
 * which screen it is showing rather than repeating the whole rail to move a
 * highlight: 0 = dashboard (step 4), 1 = the assessment (step 2), 2 = the plan
 * (step 5).
 */
const RAIL_GENERAL: LucideIcon[] = [
  LayoutGrid,
  BarChart3,
  AlignLeft,
  Sparkles,
  FileText,
];
const RAIL_SUPPORT: LucideIcon[] = [LifeBuoy, Settings];

function RailTile({ Icon, on = false }: { Icon: LucideIcon; on?: boolean }) {
  return (
    <span className={"ash-ri" + (on ? " is-on" : "")}>
      <Icon className="ash-sv" strokeWidth={1.8} aria-hidden />
    </span>
  );
}

export function AppShot({
  railActive,
  children,
}: {
  /** Index into the rail's five General tiles — which screen this shot shows. */
  railActive: number;
  children: React.ReactNode;
}) {
  return (
    <div className="ash">
      {/* browser chrome — pure decoration, hidden from AT entirely */}
      <div className="ash-chrome" aria-hidden>
        <span className="ash-dot" style={{ background: "#ff5f57" }} />
        <span className="ash-dot" style={{ background: "#febc2e" }} />
        <span className="ash-dot" style={{ background: "#28c840" }} />
        <span className="ash-url" />
      </div>

      <div className="ash-app">
        {/*
          The rail is chrome too — seven unlabelled tiles read to a screen reader
          as seven meaningless stops. Each shot's BODY stays readable, because
          that content is the pitch.
        */}
        <div className="ash-rail" aria-hidden>
          <span className="ash-rlogo">
            <LayoutGrid className="ash-sv" strokeWidth={2} aria-hidden />
          </span>
          <span className="ash-rlab">General</span>
          {RAIL_GENERAL.map((Icon, i) => (
            <RailTile Icon={Icon} on={i === railActive} key={i} />
          ))}
          <span className="ash-rlab">Support</span>
          {RAIL_SUPPORT.map((Icon, i) => (
            <RailTile Icon={Icon} key={i} />
          ))}
        </div>

        {/* `min-width:0` in the stylesheet — the grid-blowout guard belongs here */}
        <div className="ash-side">
          <div className="ash-top">
            <div className="ash-search" aria-hidden>
              <Search className="ash-sv" strokeWidth={1.9} aria-hidden />
              <span>Search here…</span>
              {/*
                ⚠ `/` NOT `⌘ K` (E150). U+2318 falls back per-glyph in Montserrat
                — the same failure class as the glyph iconography this shell
                rejects. `/` is ASCII, renders in every font, and is a real search
                convention rather than a Mac-only one on a page that is not
                Mac-only.
              */}
              <span className="ash-kbd">/</span>
            </div>
            <div className="ash-tops">
              <span className="ash-ico" aria-hidden>
                <Bell className="ash-sv" strokeWidth={1.8} aria-hidden />
                <span className="ash-dotr" />
              </span>
              <span className="ash-ico is-mag" aria-hidden>
                <PenLine className="ash-sv" strokeWidth={1.9} aria-hidden />
              </span>
              <div className="ash-who">
                <span className="ash-av" aria-hidden>
                  PI
                </span>
                {/*
                  ⚠ `.ash-whot` IS A DELIBERATE WRAPPER, NOT AN EXTRA DIV. The
                  mockups' `.who span{display:block}` silently captured the `PI`
                  avatar and killed its grid centring. Scoping the rule to this
                  wrapper's children is what keeps the avatar out of its reach.
                */}
                <span className="ash-whot">
                  <b>Paul Ingrao</b>
                  <span>Ingrao Dental Services</span>
                </span>
              </div>
            </div>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
