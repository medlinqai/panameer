import Link from "next/link";
import { HeroBox } from "@/components/marketing/HeroBox";
import { HeroVideoBackdrop } from "@/components/media/HeroVideoBackdrop";
import { HERO_COPY } from "@/lib/brand";
import { BRAND_BADGE_SHORT } from "@/lib/brand";

/**
 * The shared marketing hero (brief_home_rebuild_08_09 WS-A).
 *
 * One component, two routes: `/` renders the buyer copy, `/find-work` the
 * seller copy. Everything that differs is a lookup in HERO_COPY, so the two
 * pages cannot drift into two heroes.
 *
 * ── A SERVER COMPONENT, WITH NO STATE AT ALL ─────────────────────────────────
 *
 * The hero it replaces was a client component holding `mode` in useState, and
 * every interactive thing in it needed JavaScript. None of that survives, and
 * nothing was lost:
 *
 *  · THE SEARCH IS A PLAIN GET FORM. `action="/explore" method="get"` submits
 *    `?q=…&mode=…` with no JavaScript whatsoever — the browser has done this
 *    since 1995 — and lands on the same destination the old client handler
 *    pushed to. A hidden input carries the audience.
 *  · THE CHIPS ARE LINKS to the same destination with the term prefilled.
 *
 * The result is that the whole hero costs zero client JS and both routes stay
 * statically prerenderable, which is what leaves the assessment tabs as the
 * page's only island.
 */
export function MarketingHero({
  audience,
  headline,
  kicker,
  videoSrc,
}: {
  audience: "buyer" | "provider";
  /**
   * Overrides the brand lockup as the H1 (brief_public_pages_ia).
   *
   * The lockup was the H1 on every page. It is a good line and it says nothing
   * about the reader, so each page now leads with its own value proposition and
   * keeps the lockup as a through-line lower down. Optional rather than
   * required so a page that genuinely wants the lockup still gets it.
   */
  headline?: string;
  kicker?: string;
  /**
   * ── ⚠⚠ OPTIONAL, DEFAULTED OFF, AND THAT IS THE WHOLE DESIGN (`P1-J0-E324`) ─
   *
   * Scott: *"INTEGRATE, SHOP, WORK, TALENT — they do not have a video background.
   * please add this fix."* ⚠ BUT THIS COMPONENT SERVES MORE THAN THE PAGE HE
   * WALKED. Editing it unconditionally would put a clip on `/why-panameer`, which
   * he did not walk and did not ask for.
   *
   * ⚠ CALLERS TODAY ARE `/enterprise` AND `/why-panameer` — TWO, NOT FOUR. The
   * brief said four; `/buy-services` moved to `ShopHero` in `1d790be` and its
   * remaining mention here is a comment. Verified by grepping the imports.
   *
   * ⚠ NO `videoSrc` MEANS NO BACKDROP AND NO CLASS CHANGE — the output is
   * byte-identical, which is proven by `innerText` hash and geometry at three
   * widths on `/why-panameer` before and after, not by inspection.
   */
  videoSrc?: string;
}) {
  const copy = HERO_COPY[audience];
  // /explore reads `mode`, and treats anything that is not "work" as hiring.
  const mode = audience === "buyer" ? "hire" : "work";

  return (
    /*
      ── ⚠ BOXED, NOT FULL-BLEED (P1-J0-E264) ─────────────────────────────────
      Scott: *"TALENT/WORK: The Section 1 is fullwidth (incorrect)."* This one
      change boxes FIVE pages — /hire-talent, /find-work, /buy-services,
      /enterprise and /why-panameer — because they all render this component.
      `/enterprise` and `/why-panameer` were not in his list and are included
      deliberately: they use the same hero, and leaving two of five full-bleed
      would re-create the inconsistency the row is about.

      ⚠ THE GRADIENT MOVED ONTO THE CARD, not into a second layer. `HeroBox`
      owns the inset and the radius; the surface is still this hero's own, so a
      page that wants a different one changes it here and nowhere else.
    */
    <HeroBox
      cardClassName={
        /*
          ⚠ `isolate` ONLY WHEN THERE IS A CLIP — it keeps the video and scrim
          stacking inside this card rather than against the page. Without a clip the
          string is character-for-character what it always was, which is what makes
          the unchanged callers unchanged.
        */
        (videoSrc ? "isolate " : "") +
        "bg-[radial-gradient(1100px_500px_at_82%_-10%,rgba(215,44,214,0.42),transparent_60%),linear-gradient(150deg,#0d1230_0%,#191a44_55%,#3a1c53_100%)] text-white"
      }
    >
      {/*
        ⚠⚠ THE CLIP, WHEN A CALLER ASKS FOR ONE (`P1-J0-E324`). `HeroVideoBackdrop`
        is COMPOSED, NEVER EDITED — no props added, no behaviour changed; it still
        serves `/`, `/learn` and `/hire-talent` unchanged.

        ⚠ THE CARD'S GRADIENT STAYS AND IS NOT DECORATION. It paints before the clip
        arrives, it is what a `prefers-reduced-motion` visitor sees (`globals.css`
        hides `[data-autoplay-video]` outright), and it is the only thing
        guaranteeing the white `<h1>` is legible over whatever the camera saw. The
        scrim re-lays this card's own three hexes over the footage.
      */}
      {videoSrc ? (
        <HeroVideoBackdrop
          src={videoSrc}
          videoClassName="absolute inset-0 h-full w-full object-cover opacity-40"
          scrimClassName="absolute inset-0 bg-[linear-gradient(150deg,rgba(13,18,48,0.86)_0%,rgba(25,26,68,0.72)_55%,rgba(58,28,83,0.62)_100%)]"
        />
      ) : null}
      {/*
        The faint grid, masked to the top-right so it fades before it reaches
        the copy. Decorative, and the mask is what keeps it from competing with
        the headline for attention.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(700px_400px_at_75%_30%,#000,transparent_75%)]"
      />

      <div className="relative mx-auto max-w-[1120px] px-7 pb-[62px] pt-14">
        <span className="mb-[22px] inline-block rounded-full bg-magenta px-3.5 py-1.5 font-display text-[12.5px] font-semibold uppercase tracking-[0.18em] text-white">
          {kicker ?? copy.kicker}
        </span>

        {/*
          The badge, hard-wrapped after "Connect." exactly as the mockups set
          it. A <br> rather than a width, because the break is a design decision
          about rhythm — two beats per line — not a consequence of the container.
          Hidden below sm, where 40px type wraps on its own anyway.
        */}
        {headline ? (
          <h1 className="max-w-[720px] text-balance text-[38px] font-semibold leading-[1.05] tracking-[-0.01em] sm:text-[52px]">
            {headline}
          </h1>
        ) : (
          <h1 className="text-[40px] font-semibold leading-[1.02] tracking-[-0.01em] sm:text-[60px]">
            {BRAND_BADGE_SHORT.split(". ").slice(0, 2).join(". ") + "."}
            <br className="hidden sm:block" />{" "}
            {BRAND_BADGE_SHORT.split(". ").slice(2).join(". ")}
          </h1>
        )}

        <p className="mt-5 max-w-[600px] text-balance text-[17px] text-[#e9e6f5] sm:text-[19px]">
          {copy.subhead}
        </p>

        {/*
          WS-2b — THE AUDIENCE PILL IS GONE FROM HERE. It sat directly on top of
          the search box and read as a filter on it, while actually navigating
          to a different page. The switch moved to the top strip
          (AudienceStrip), where changing pages is what the whole zone is for.

          No "Find Talent / Find Work" scope toggle replaces it. The brief makes
          that optional, and the search is already scoped by the page: `/` posts
          mode=hire and /find-work posts mode=work. A second control that
          re-states what the page already decided would put an ambiguous pill
          back in the exact spot the ambiguous pill was just removed from.
        */}

        {/*
          WS-2 — "GET STARTED NOW" LEFT THIS SPOT. It framed the search, which
          was the right instinct in the wrong place: the hero is where somebody
          decides whether to keep reading, and an eyebrow telling them to start
          arrives before they have a reason to. It is the closing CTA's eyebrow
          now, where the page has already made its case.
        */}

        {/* ── Search: a real GET form, no JavaScript ── */}
        <form
          action="/explore"
          method="get"
          className="mt-8 flex w-full max-w-[620px] rounded-full bg-white py-[7px] pl-5 pr-[7px] shadow-[0_18px_40px_rgba(0,0,0,0.28)] sm:pl-[22px]"
        >
          <input type="hidden" name="mode" value={mode} />
          <input
            name="q"
            aria-label={copy.searchPlaceholder}
            placeholder={copy.searchPlaceholder}
            className="min-w-0 flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-[#9aa0b8]"
          />
          <button
            type="submit"
            className="shrink-0 whitespace-nowrap rounded-full bg-magenta px-4 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-magenta-dark sm:px-6"
          >
            {copy.searchCta}
          </button>
        </form>

        <div className="mt-[18px] flex max-w-[720px] flex-wrap gap-2.5">
          {copy.chips.map((chip, i) => (
            <Link
              key={chip}
              href={`/explore?mode=${mode}&q=${encodeURIComponent(chip)}`}
              className={
                "rounded-full px-4 py-2 text-[13.5px] transition-colors " +
                // The first chip is the accented one in both mockups.
                (i === 0
                  ? "border border-magenta bg-magenta/[0.16] text-white"
                  : "border border-white/[0.22] bg-white/[0.04] text-[#e4e1f2] hover:border-white/60")
              }
            >
              {chip}
            </Link>
          ))}
        </div>

        {/*
          ⚠ MICROCOPY, NOT A CONTROL. Both AI hints describe what the sign-up
          flow does with a document or a résumé — the résumé parser is real and
          shipped — but there is no drop target in this hero, so it is a
          sentence and never a button. Dressing it as an upload would be the
          page implying something it cannot do.
        */}
        <p className="mt-3.5 flex items-center gap-[7px] text-[13.5px] text-[#cdc9e6]">
          <span aria-hidden className="text-magenta">
            ✦
          </span>
          {copy.aiHint}
        </p>

        {/* The lockup, kept as the through-line when a page leads with value. */}
        {headline && (
          <p className="mt-7 font-display text-[13px] font-semibold uppercase tracking-[0.2em] text-[#a7a3c6]">
            {BRAND_BADGE_SHORT}
          </p>
        )}
      </div>
    </HeroBox>
  );
}
