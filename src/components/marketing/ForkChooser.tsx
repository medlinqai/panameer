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
 *
 * E077 — AND AT THE BOTTOM IT IS THE PAGE'S CTA, not its navigation. That is a
 * claim about the whole page: `/` sells the model — the badge, then the four
 * primers — and then asks for exactly one thing, which is that you say which
 * side you are on. So the copy here changed register. It used to introduce a
 * choice ("Panameer has two sides…"); it now closes an argument, because by
 * the time anyone reaches it they have read the argument.
 *
 * ⚠ AND IT IS THE ONLY ASK. No "create your profile", no "get started free",
 * no email capture anywhere on `/` — the header's Sign Up button is the sole
 * signup on the page, and it was already there. Conversion happens on the
 * audience pages, after the audience-specific value; asking here would be
 * asking before the reader knows which product they are being sold.
 */
export function ForkChooser() {
  return (
    <section id="fork" className="bg-bg-soft py-[76px]">
      <div className="mx-auto max-w-[1180px] px-6">
        <Eyebrow>Pick Your Side</Eyebrow>
        {/*
          E068 — "WHAT'S IN IT FOR YOU?" rather than "Which One Are You
          Today?". The old headline asked the reader to classify themselves
          before it had given them a reason to; this one leads with what they
          get and lets the role fall out of the answer. Same fork, opposite
          direction — the question is about value, not identity.
        */}
        <H2>What&apos;s in It for You?</H2>
        <Lead>
          That depends on which side of it you are on. You have seen how the
          platform works — now pick your side, and we&apos;ll show you the value
          built for it.
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
