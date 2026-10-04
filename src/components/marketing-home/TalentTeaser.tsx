import Link from "next/link";
import { ProviderCard } from "@/components/marketplace/ProviderCard";
import type { TeaserProvider } from "@/lib/explore";

const SAMPLE: TeaserProvider = {
  id: "sample",
  firstName: "Alexandra",
  title: "Oracle Cloud & AI Transformation Expert",
  headline: "Oracle Cloud & AI Transformation Expert",
  location: "New York, United States",
  university: "Wharton School",
  employerCount: 4,
  projectCount: 12,
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
            The Talent You Could
            <br />
            Never Hire &mdash; Until Now.
          </h2>
          <div className="sub">
            Ivy League minds. Big-4 pedigree. Decades inside the systems that run
            the enterprise. The people who&rsquo;d normally be out of reach
            &mdash; a click away, ready to work for you.
          </div>
          {}
          <Link className="btn btn-solid" href="/talent">
            Browse the Talent &rsaquo;
          </Link>
        </div>

        {}
        <div className="rcard-slot">
          {}
          <ProviderCard
            p={SAMPLE}
            loginHref="/talent"
            profileHref="/talent"
          />
        </div>
      </div>
    </section>
  );
}
