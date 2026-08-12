import Link from "next/link";
import { ProviderCard } from "@/components/marketplace/ProviderCard";
import type { TeaserProvider } from "@/lib/explore";

/**
 * THE DARK TALENT TEASER (brief §6).
 *
 * ── THE CARD IS THE REAL ONE ─────────────────────────────────────────────────
 *
 * The brief is explicit: use the REAL `/explore` card, do not rebuild it. So
 * the mockup's hand-written `.rcard` markup is NOT ported — `ProviderCard` is
 * imported instead, and it was extracted out of `/explore` in this same commit
 * so both surfaces render one component.
 *
 * That is worth more than consistency. The card enforces a privacy rule:
 * `TeaserProvider` has no surname field at all, and the CTA routes to a login
 * gate rather than to /providers/[id], because that route renders the full
 * profile (E032). A lookalike built to match the mockup's markup would have
 * inherited the LOOK and none of the rule.
 *
 * ⚠ THE PERSON IS FICTIONAL. "Alexandra Chen" is the mockup's sample persona
 * and the photo is a stock headshot from the design folder. No such provider
 * exists; nothing here reads from the database. Sample data shaped exactly like
 * the real type, which is what keeps it honest when real data arrives.
 *
 * WHERE THE MOCKUP AND THE COMPONENT DIVERGE, the component wins — that is what
 * "use the real card" means. The mockup shows the tags as three pills and a
 * rate above a full-width magenta button; the real card renders three tags, the
 * rate, and an outlined CTA. The brief anticipates this ("keep the real card's
 * rate field; Scott sets the value").
 */

/**
 * The mockup's sample, in the shape `/explore` produces.
 *
 * `id` is only ever used to build the post-login callback, so a literal is
 * correct here — there is no provider to point at.
 */
const SAMPLE: TeaserProvider = {
  id: "sample",
  firstName: "Alexandra",
  headline: "AI-Enabled Oracle Cloud & Enterprise Systems Expert",
  location: "New York, United States",
  skills: ["Oracle Cloud", "AI Strategy", "Procure-to-Pay"],
  rate: "$225/hr",
  validated: true,
  photoUrl: "/marketing/talent-alexandra.jpg",
};

export function TalentTeaser() {
  return (
    <section className="cta-dark">
      <div className="wrap">
        <div>
          <div className="cta-kicker">Our Talent</div>
          <h2>
            The talent you could
            <br />
            never hire &mdash; until now.
          </h2>
          <div className="sub">
            Ivy League minds. Big-4 pedigree. Decades inside the systems that run
            the enterprise. The people who&rsquo;d normally be out of reach
            &mdash; a click away, ready to work for you.
          </div>
          {/*
            Both CTAs go to /hire-talent per the brief. A real route, not a
            stub — it is the shipped buyer marketplace page.
          */}
          <Link className="btn btn-solid" href="/hire-talent">
            Browse the talent &rsaquo;
          </Link>
        </div>

        {/*
          The real card, on the dark band. It brings its own white surface, so
          it sits on this section the same way it sits on /explore.
        */}
        <div className="rcard-slot">
          <ProviderCard p={SAMPLE} loginHref="/hire-talent" />
        </div>
      </div>
    </section>
  );
}
