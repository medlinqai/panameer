import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { IntegrateHero } from "@/components/marketing/IntegrateHero";
import { IntegrateSpine } from "@/components/marketing/IntegrateSpine";

/**
 * /enterprise — the ERP integration story, at its own address
 * (brief_public_ia_block2 WS-2).
 *
 * ── A DESTINATION, BUILT BEFORE ANYTHING MOVES ───────────────────────────────
 *
 * Scott's rule: nothing comes off Home until its destination page exists and
 * renders it. Relocation is a move, never a delete. So this page exists and
 * `ErpIntegration` ALSO still renders on `/`. The same section deliberately
 * renders in two places until block 3 removes it from Home. That is intended
 * and temporary — do not "fix" it by deleting either one.
 *
 * ── NO AUDIENCE STRIP, AND NO NAV ITEM ───────────────────────────────────────
 *
 * `MarketingShell` without `page` (WS-1). The strip is a three-way intent
 * switch and this is not one of the three; adding a fourth entry would have
 * changed it on Home, Hire Talent and Find Work. Reachable from the FOOTER
 * only — Scott's 2026-08-17 decision keeps the header at four items.
 *
 * ── ⚠ THE `.pm-home` WRAPPER IS LOAD-BEARING ─────────────────────────────────
 *
 * `ErpIntegration` is a marketing-home section: every rule that styles it in
 * `home.css` is prefixed `.pm-home`, and `MarketingShell` renders no such
 * scope. MEASURED, not assumed — strip the class in the browser and `.erpx-h2`
 * drops from 40px/900px-wide to 16px/full-bleed. The section renders as
 * unstyled stacked text without it.
 *
 * The wrapper goes INSIDE the shell and around the PAYLOAD ONLY — never around
 * the header or footer, which are Tailwind components the ported stylesheet's
 * own comment records having broken once already. Verified: `header`, the hero
 * `h1` and `footer` all resolve `closest(".pm-home") === null`.
 *
 * ⚠ `erpx-band` IS PASSED IN, exactly as `/` passes it. The component owns no
 * background or padding of its own precisely so a second surface can supply its
 * own chrome; this is that second surface.
 *
 * ⚠ `/hire-talent` carries `ErpPunchout`, a DIFFERENT ERP section with a
 * different job. It is untouched and not reconciled with this one — that they
 * coexist is a question for Scott, not a task here.
 *
 * Server component throughout, so this route prerenders static.
 */
export const metadata: Metadata = {
  title: "Enterprise ERP Integration — Panameer",
  description:
    "Search, request, order and settle services from inside Oracle Cloud, SAP " +
    "and other systems of record — without leaving your ERP.",
};

export default function EnterprisePage() {
  return (
    <MarketingShell>
      {/*
        ── ⚠⚠ WALK 1: THIS PAGE SAID `PLACEHOLDER` (`P1-J0-E325`) ─────────────

        `/integrate` had never been walked. Its kicker read `PLACEHOLDER —
        Enterprise` and its `<h1>` read `PLACEHOLDER — headline about ERP
        integration goes here.` ⚠ IT IS `IntegrateHero` NOW — its own component
        composing the same `HeroBox` + `HeroVideoBackdrop` + `HeroTwoUp` every other
        pillar hero uses, so nothing about the SHAPE is re-implemented.

        ⚠ `MarketingHero` IS UNTOUCHED AND STILL SERVES `/why-panameer`, which is
        not in this brief and is proven byte-identical in the report. Its `videoSrc`
        prop stays; this page simply no longer calls it.

        ⚠ THE CLIP AND ITS POSTER MOVED ACROSS UNCHANGED — `consultation-hero.mp4`
        (0.26MB) with `/posters/create.svg`. Losing the poster would have taken this
        page's LCP from ~1.8s back to ~3.7s (`P1-ALL-E018`).
      */}
      <IntegrateHero />
      {/*
        ── ⚠ THE RIBBON WAS TRIED HERE AND REMOVED (`P1-J0-E326`, closed) ──────

        `brief_integrate_walk1` added `LogoRibbon` below this hero on Scott's
        request — *"Let's bring back the ribbon on this page."* ⚠ HE WALKED IT AND
        TOOK IT BACK OUT: *"I tried it there and it doesn't fit."*

        ⚠ `LogoRibbon.tsx` STAYS ON DISK AND ITS CALL SITE ON `/` IS UNTOUCHED —
        the `E164` shape. This page simply no longer calls it.

        ⚠ THE `.pm-home` WRAPPER THAT EXISTED ONLY FOR THE RIBBON WENT WITH IT.
        Every class the component uses (`.logos`, `.wrap`, `.row`, `.co`) is a
        `.pm-home`-prefixed rule in `home.css`, so the wrapper was load-bearing
        while the ribbon was here and is dead weight now. ⚠ THE SEPARATE WRAPPER
        AROUND `ErpIntegration` BELOW IS A DIFFERENT ONE AND STAYS.

        ⚠ WHAT IT RENDERED IS STILL WORTH KNOWING IF IT IS EVER RECONSIDERED: six
        INVENTED company names — Meridian, Northpeak, Vantage, Cedarline, Halcyon,
        Brightpath — beside generic SVG glyphs. Not customers, not logos. That is
        reported against `/`, where it still ships.
      */}
      {/*
        ── ⚠⚠ THE SIXTH SPINE (`P1-J0-E328`) ───────────────────────────────────

        ⚠ IT CLOSES THE OPEN ROW `brief_integrate_walk1` FILED. That brief shipped
        the hero's bridge line — *"Check out the steps below to see how it works."*
        — onto a page with NO steps below it, and recorded the gap. There are steps
        now, and the line points at them.

        ⚠ PLACEMENT: directly below the hero and ABOVE `ErpIntegration`, so the
        bridge line's "below" is the very next thing a reader meets.

        ⚠⚠ ZERO OF THE FIVE ARE BUILT AND SCOTT SAID SO: *"Yes, it is not built,
        but it will be before this is released."* Same standing as `/shop`.
        Outstanding parts gate PROMOTION, not the build; all five are on the
        pre-launch list as one block.

        ⚠ OUTSIDE THE `.pm-home` WRAPPER, deliberately — `StepDisclosures` is
        `.stepd-`-scoped and the eyebrow mirrors `/optimize` in Tailwind.
      */}
      <IntegrateSpine />
      {/*
        ── ⚠⚠ `ErpIntegration` AND `id="punchout"` BOTH LEFT (`P1-J0-E359`) ────────

        Scott, 2026-08-29: *"this page is incorrect. It puts the image on the same
        page (muddies the water) and then scrolls down to it... I want to move image 2
        to a secon[d] page. then i want to link the button - image 3 - to that page."*
        The section is now at `/erp-integration` and the hero button goes there.

        ⚠ SUPERSEDED, quoted not deleted: *"── ⚠⚠ THIS WRAPPER NOW OWNS
        `id="punchout"` (`P1-J0-E333`) ── ⚠ THE HERO'S CTA IS `href="#punchout"` AND
        IT IS THAT HERO'S ONLY CONTROL... ⚠ THE CTA's `href` AND LABEL DID NOT CHANGE.
        Only what `#punchout` names."* Both halves are now false: the id is gone from
        this page and the CTA's `href` DID change (its LABEL still did not).

        ⚠ THE `scroll-mt-[71px]` MEASUREMENT TRAVELLED WITH THE ANCHOR — the sticky
        `MarketingHeader` is 71px, read off `getBoundingClientRect()` at 1440 rather
        than guessed. It lives in `app/erp-integration/page.tsx` now.
        ⚠ THE `.pm-home` WRAPPER WENT TOO, because it existed only for this section.
        `IntegrateSpine` is `StepDisclosures`, `.stepd-`-scoped in its own stylesheet,
        and was always outside it.

        ⚠ THIS PAGE ENDS ON THE SPINE. Do not re-add the section — it renders on
        exactly one page and `§43` asserts that.
      */}
      {/*
        ── ⚠⚠ `ErpPunchout` HAS MOVED TO `/` (`P1-J0-E333`, 2026-08-26) ──────────

        SCOTT, 2026-08-26, screenshotting *"Punch out for talent — not just parts."*:
        *"Move this graphic to the home page."*

        ⚠⚠ THIS REVERSED HIS OWN EARLIER INSTRUCTION AND THE DEAD ONE IS QUOTED SO
        NOBODY RESTORES IT CITING `E020`:
          `P1-J1-E020`, 2026-08-24, same component:
            *"This needs to be moved to INTEGRATE."*
        It went `/hire-talent` -> `/integrate` then, and `/integrate` -> `/` now.
        ⚠ THE LATER INSTRUCTION WINS. Do not move it back on the strength of the
        2026-08-24 note — read the date before acting on either.

        ⚠ A MOVE, NOT A COPY. Two copies of one diagram is two sources of truth, so
        it renders ONLY on `/` now (`app/page.tsx`, outside the `.pm-home` wrapper).
        ⚠ THE COMPONENT GAINED `marketing-surface font-body` ON ITS OWN ROOT to
        survive the move — Scott approved that on 2026-08-26 after the first attempt
        measured 33 property differences. It had been inheriting its whole
        environment from `MarketingShell` on THIS page. See the header of
        `ErpPunchout.tsx`; the classes are INERT here, measured identical.

        ⚠ SUPERSEDED, quoted not deleted: *"WHAT STAYED BEHIND: `id="punchout"`,
        re-homed onto the `ErpIntegration` wrapper above, because the hero's only CTA
        points at it."* ⚠ NOTHING STAYED BEHIND AS OF `P1-J0-E359` — the wrapper, the
        section and the id all moved to `/erp-integration`, and the hero's only CTA is
        now a page link rather than a same-page anchor. THIS PAGE HAS NO `#punchout`.
      */}
    </MarketingShell>
  );
}
