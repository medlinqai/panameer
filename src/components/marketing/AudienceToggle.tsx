import Link from "next/link";
import { AUDIENCE_CHOICES, AUDIENCE_PATH, type Audience } from "@/lib/audience";
import { FocusRemember } from "@/components/marketing/FocusRemember";

/**
 * "What Do You Do?" — the fork strip (E060, E061).
 *
 * RESTYLED TO MATCH THE DEV BANNER, which is the point of E061: two full-width
 * strips stacked at the top of every page, one a pale magenta band and one a
 * bordered white bar with a pill group floating in it, read as two unrelated
 * systems. Same tint, same border, same weight — they now read as one stack of
 * page-level notices, and the label got loud enough to be the thing you notice
 * rather than a caption on a control ("I'm here to:" at 13.5px regular →
 * "Focus this Page:" at 14px bold).
 *
 * STILL TWO LINKS, STILL NOT A CLIENT COMPONENT. Which side is active comes
 * from the page's own prop, so it works with no JS, prefetches both
 * destinations, and middle-click behaves. Only the dismiss button needs a
 * client, and it is its own tiny component so this one stays static.
 *
 * PERMANENT — THERE IS NO DISMISS (E061). It had one, and the reasoning against
 * it is simple: the strip exists to get a side picked, and the only thing
 * Dismiss did was let the question be closed unanswered. A visitor who has
 * chosen no longer needs the strip because they are on their page and the
 * option is filled in; a visitor who has not is precisely who it is for.
 *
 * The label carries the change. "Focus this Page:" described what the control
 * did to the page — a mechanism. "What Do You Do?" asks the reader something,
 * and a question is harder to scroll past than an instruction.
 *
 * REMEMBER-ONLY, NEVER REDIRECT. The cookie pre-highlights the last choice with
 * a ring; it does not move anybody. See lib/focus-strip.ts.
 *
 * STICKY UNDER THE HEADER at `top-[70px]` — the header's exact height, and a
 * lower z-index so the header's blur sits over this rather than under it.
 */
export function AudienceToggle({ audience }: { audience: Audience }) {
  return (
    /*
      `data-focus-strip` scopes the pre-highlight rule in globals.css, so the
      ring can be applied from a <html> attribute without this staying a client
      component.
    */
    <div
      data-focus-strip
      className="sticky top-[70px] z-40 border-b border-magenta/20 bg-magenta/8 px-4 py-2.5 backdrop-blur-[10px] sm:px-6"
    >
      {/*
        `justify-center` with a plain gap, and nothing pushed to either edge.
        Dismiss used to float right, which meant the question and its two
        answers sat off-centre with a dead span of strip beside them. With it
        gone the three parts are one centred group — which is what they always
        were.
      */}
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-center gap-x-3.5 gap-y-2">
        <span className="text-[15px] font-bold text-ink">What Do You Do?</span>

        <div className="inline-flex rounded-full border border-line bg-white p-1">
          {AUDIENCE_CHOICES.map((c) => {
            const active = audience === c.audience;
            return (
              <Link
                key={c.audience}
                href={AUDIENCE_PATH[c.audience]}
                aria-current={active ? "page" : undefined}
                /*
                  `data-opt` lets the boot script's CSS put a ring on the
                  remembered choice without this component knowing the cookie
                  exists — which is what keeps it a server component.
                */
                data-opt={c.audience}
                className={
                  "rounded-full px-[18px] py-1.5 text-[14px] font-bold transition-colors " +
                  (active
                    ? "bg-magenta text-white"
                    : "text-ink-2 hover:text-magenta")
                }
              >
                {c.label}
              </Link>
            );
          })}
        </div>

        <FocusRemember audience={audience} />
      </div>
    </div>
  );
}
