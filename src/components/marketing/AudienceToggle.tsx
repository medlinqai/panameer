import Link from "next/link";
import { AUDIENCE_CHOICES, AUDIENCE_PATH, type Audience } from "@/lib/audience";

/**
 * "I'm here to: [ Hire an Expert ] [ Work & Earn ]" — the fork control (E051).
 *
 * IT IS TWO LINKS, AND IT IS NOT A CLIENT COMPONENT. That is the load-bearing
 * decision in this file. The obvious build is a client component holding the
 * chosen audience in state and pushing a route on click; this needs neither,
 * because the audience IS the route. Which one is active comes from the
 * `audience` prop the page already knows, so:
 *
 *   · it renders and works with no JavaScript,
 *   · Next prefetches both destinations on hover,
 *   · middle-click and "open in new tab" behave, which they do not on a button
 *     that calls router.push,
 *   · and there is no state that can disagree with the URL.
 *
 * On `/` neither option is active — the combined landing has not forked yet, so
 * showing one as selected would be a lie about where you are. On an audience
 * page the current side is marked and the other is the way across.
 *
 * STICKY UNDER THE HEADER. `top-[70px]` is the header's height: the header is
 * `sticky top-0 z-50`, so this has to sit below it rather than under it, and a
 * lower z-index keeps the header's shadow over this band rather than the
 * reverse.
 */
export function AudienceToggle({ audience }: { audience: Audience }) {
  return (
    <div className="sticky top-[70px] z-40 border-b border-line bg-white/92 backdrop-blur-[10px]">
      <div className="mx-auto flex max-w-[1180px] items-center justify-center gap-3 px-6 py-2.5">
        <span className="hidden text-[13.5px] font-semibold text-ink-2 sm:block">
          I&apos;m here to:
        </span>

        <div className="inline-flex rounded-full border border-line bg-bg-soft p-1">
          {AUDIENCE_CHOICES.map((c) => {
            const active = audience === c.audience;
            return (
              <Link
                key={c.audience}
                href={AUDIENCE_PATH[c.audience]}
                aria-current={active ? "page" : undefined}
                className={
                  "rounded-full px-[18px] py-2 text-[14px] font-bold transition-colors " +
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
      </div>
    </div>
  );
}
