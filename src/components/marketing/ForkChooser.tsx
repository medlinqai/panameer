import Link from "next/link";
import { Eyebrow, H2, Lead } from "@/components/marketing/section";
import { AUDIENCE_CHOICES, AUDIENCE_PATH } from "@/lib/audience";

/**
 * "Two Ways In" — the combined landing's actual job (E051).
 *
 * `/` no longer tries to sell both sides of a two-sided market in one scroll.
 * It orients and it forks, and this is the fork: two cards, one per audience,
 * each saying enough to make the choice obvious.
 *
 * WHY THIS EXISTS WHEN THE TOGGLE IS ALREADY ON THE PAGE. The toggle is a
 * control in a sticky band — small, persistent, easy to skim past on a first
 * visit, and deliberately so, because its job is to be available everywhere
 * rather than to explain anything. This is the same fork given room to argue:
 * it can afford a sentence per side, which the toggle cannot. Both point at
 * the same two routes, from one map, so they cannot drift apart.
 */
export function ForkChooser() {
  return (
    <section id="fork" className="bg-bg-soft py-[76px]">
      <div className="mx-auto max-w-[1180px] px-6">
        <Eyebrow>Two Ways In</Eyebrow>
        <H2>Which One Are You Today?</H2>
        <Lead>
          Panameer has two sides and they want different things from it. Pick
          the one you came for — you can switch at any time.
        </Lead>

        <div className="grid gap-5 md:grid-cols-2">
          {AUDIENCE_CHOICES.map((c) => (
            /*
              THE WHOLE CARD IS THE LINK. A card with a button in the corner
              gives you a small target inside a large clickable-looking shape,
              which is the pattern that trains people to click twice.
            */
            <Link
              key={c.audience}
              href={AUDIENCE_PATH[c.audience]}
              className="group flex flex-col rounded-brand border-[1.5px] border-line bg-white p-7 transition-all hover:-translate-y-0.5 hover:border-magenta hover:shadow-brand"
            >
              <h3 className="text-[22px] font-bold text-ink">{c.label}</h3>
              <p className="mt-2 flex-1 text-[15.5px] leading-relaxed text-ink-2">
                {c.blurb}
              </p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-[15px] font-bold text-magenta">
                {c.audience === "buyer" ? "See How Hiring Works" : "See How Earning Works"}
                <span
                  aria-hidden
                  className="transition-transform group-hover:translate-x-0.5"
                >
                  →
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
