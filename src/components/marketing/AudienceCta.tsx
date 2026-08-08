import { Btn } from "@/components/marketing/brand";
import type { Audience } from "@/lib/audience";

/**
 * The closing ask on each audience page (WS-D / WS-E).
 *
 * Both fork pages needed one and they differ only in words, so this is one
 * component with two copies rather than two components that will drift. The
 * neutral case is never rendered — `/` closes on the fork chooser, which is a
 * better last thing than a CTA that has to be vague to serve both sides — but
 * the type covers it because Audience has three members and a switch that
 * silently returns nothing is worse than one that states its default.
 *
 * SECONDARY IS ALWAYS THE OTHER SIDE'S PAGE. A reader who has scrolled a whole
 * audience page and not converted is quite likely on the wrong one, and the
 * sticky toggle is back at the top by then.
 */
const COPY: Record<
  Audience,
  { heading: string; body: string; cta: string; href: string; alt: string; altHref: string }
> = {
  buyer: {
    heading: "Post Your First Work Request — It's Free",
    body: "Describe the work once. We match it against every provider's skills, and you only pay when you agree to something.",
    cta: "Post a Work Request",
    href: "/join?type=buyer",
    alt: "I'm Here to Work Instead",
    altHref: "/for-providers",
  },
  provider: {
    heading: "Build the Profile Buyers Search",
    body: "Free to join, free to learn, free to be listed. Get certified on the applications you already know and be there when the work arrives.",
    cta: "Create Your Provider Profile",
    href: "/join?type=seller",
    alt: "I'm Here to Hire Instead",
    altHref: "/for-buyers",
  },
  neutral: {
    heading: "Two Ways In",
    body: "Hire an expert, or get hired for what you do best.",
    cta: "Hire an Expert",
    href: "/for-buyers",
    alt: "Work & Earn",
    altHref: "/for-providers",
  },
};

export function AudienceCta({ audience }: { audience: Audience }) {
  const c = COPY[audience];
  return (
    <section className="py-[76px]">
      <div className="mx-auto max-w-[1180px] px-6">
        <div className="rounded-[22px] bg-[linear-gradient(115deg,#171E3E,#2a1c4a_60%,#5a1f5a)] px-8 py-12 text-center text-white sm:px-14 sm:py-16">
          <h2 className="mx-auto max-w-[760px] text-[28px] font-extrabold leading-[1.1] tracking-[-0.9px] sm:text-[38px]">
            {c.heading}
          </h2>
          <p className="mx-auto mt-4 max-w-[620px] text-[17px] leading-relaxed text-white/85">
            {c.body}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Btn href={c.href}>{c.cta}</Btn>
            {/*
              A white-outline ghost rather than the shared `variant="ghost"`,
              which is built for light surfaces: its ink text on this panel
              would be near-invisible. Same role in the button standard (E217),
              repainted for a dark background.
            */}
            <a
              href={c.altHref}
              className="inline-flex items-center justify-center rounded-full border-[1.5px] border-white/40 px-[22px] py-3 text-[15px] font-bold text-white transition-colors hover:border-white hover:bg-white/10"
            >
              {c.alt}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
