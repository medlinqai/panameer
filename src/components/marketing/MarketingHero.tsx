import Link from "next/link";
import { AUDIENCE_TOGGLE, HERO_COPY } from "@/lib/brand";
import { BRAND_BADGE_SHORT } from "@/lib/brand";
import { AUDIENCE_PATH } from "@/lib/audience";

/**
 * The shared marketing hero (brief_home_rebuild_08_09 WS-A).
 *
 * One component, two routes: `/` renders the buyer copy, `/for-providers` the
 * seller copy. Everything that differs is a lookup in HERO_COPY, so the two
 * pages cannot drift into two heroes.
 *
 * ── A SERVER COMPONENT, WITH NO STATE AT ALL ─────────────────────────────────
 *
 * The hero it replaces was a client component holding `mode` in useState, and
 * every interactive thing in it needed JavaScript. None of that survives, and
 * nothing was lost:
 *
 *  · THE TOGGLE IS TWO <Link>s. The audience is the route, so which side is
 *    active is a fact about the URL, not a piece of state. Links are indexable,
 *    prefetched, back-button-safe and middle-clickable; a button calling
 *    router.push is none of those.
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
export function MarketingHero({ audience }: { audience: "buyer" | "provider" }) {
  const copy = HERO_COPY[audience];
  // /explore reads `mode`, and treats anything that is not "work" as hiring.
  const mode = audience === "buyer" ? "hire" : "work";

  return (
    <div className="relative overflow-hidden bg-[radial-gradient(1100px_500px_at_82%_-10%,rgba(215,44,214,0.42),transparent_60%),linear-gradient(150deg,#0d1230_0%,#191a44_55%,#3a1c53_100%)] text-white">
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
          {copy.kicker}
        </span>

        {/*
          The badge, hard-wrapped after "Connect." exactly as the mockups set
          it. A <br> rather than a width, because the break is a design decision
          about rhythm — two beats per line — not a consequence of the container.
          Hidden below sm, where 40px type wraps on its own anyway.
        */}
        <h1 className="text-[40px] font-semibold leading-[1.02] tracking-[-0.01em] sm:text-[60px]">
          {BRAND_BADGE_SHORT.split(". ").slice(0, 2).join(". ") + "."}
          <br className="hidden sm:block" />{" "}
          {BRAND_BADGE_SHORT.split(". ").slice(2).join(". ")}
        </h1>

        <p className="mt-5 max-w-[560px] text-[17px] text-[#e9e6f5] sm:text-[19px]">
          {copy.subhead}
        </p>

        {/* ── The audience toggle: two Links, never state ── */}
        {/*
          STACKS BELOW sm. The two labels are deliberately long and literal —
          "I Hire Experts & Buy Services" — and as an inline-flex pill pair they
          need roughly 700px. At 390px that does not overflow the toggle, it
          overflows the PAGE: the widest child sets the scroll width, so the
          hero, the subhead and every chip get dragged off-screen with it.
          Two stacked full-width pills on a phone, the pill pair from sm up.
        */}
        <div
          className="mb-[18px] mt-[30px] flex w-full flex-col gap-1 rounded-[22px] border border-white/[0.16] bg-white/[0.08] p-[5px] sm:inline-flex sm:w-auto sm:flex-row sm:rounded-full"
          role="group"
          aria-label="Choose which side of Panameer you are on"
        >
          {(["buyer", "provider"] as const).map((side) => {
            const on = side === audience;
            return (
              <Link
                key={side}
                href={AUDIENCE_PATH[side]}
                aria-current={on ? "page" : undefined}
                className={
                  "rounded-full px-5 py-[11px] text-center text-[14.5px] font-semibold transition-colors " +
                  (on
                    ? "bg-white text-ink shadow-[0_2px_10px_rgba(0,0,0,0.18)]"
                    : "text-[#cdc9e6] hover:text-white")
                }
              >
                {AUDIENCE_TOGGLE[side]}
              </Link>
            );
          })}
        </div>

        {/* ── Search: a real GET form, no JavaScript ── */}
        <form
          action="/explore"
          method="get"
          className="flex w-full max-w-[620px] rounded-full bg-white py-[7px] pl-5 pr-[7px] shadow-[0_18px_40px_rgba(0,0,0,0.28)] sm:pl-[22px]"
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
      </div>
    </div>
  );
}
