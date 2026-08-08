import { BRAND_COMMUNITY_LINE } from "@/lib/brand";

/**
 * The announcement ribbon (E004 → E015 → E016.3).
 *
 * WHAT WAS HERE ORIGINALLY WAS ANOTHER COMPANY'S PITCH: "Get instant access to
 * the top 1% of talent on Business Plus." Three things wrong with one sentence
 * — "top 1%" is the colosseum framing this brand is explicitly not; "Business
 * Plus" is not a Panameer tier and never has been; and "instant access to
 * talent" describes a staffing agency rather than a place where people learn,
 * connect and get paid.
 *
 * THE MANIFESTO THEN HELD THE SLOT (E016.3, superseding E015). "The world's
 * gotten adversarial. Let's build something together." answers WHY Panameer
 * exists, which is the strongest thing on an About page and the weakest thing
 * on a strip a first-time visitor reads in half a second — it assumes they
 * already care. It keeps its home in Punchout.
 *
 * E039 — NOW IT IS THE CREDITS LINE. The "anyone can build skills…" version
 * that replaced the manifesto described the community; this describes the
 * economy underneath it, which is the part nothing else on the page explains.
 *
 * ⚠ Credits do not work yet. The reasoning for shipping it anyway — and the
 * dependency on the dev banner directly above this strip — is on
 * BRAND_COMMUNITY_LINE in lib/brand.ts, where the string lives.
 */
export function Announcement() {
  return (
    <div className="bg-magenta px-4 py-2.5 text-center text-[14.5px] font-semibold text-white">
      {/*
        `text-balance` rather than a fixed width: this is one long sentence
        that WILL wrap below desktop, and balancing splits it evenly instead of
        leaving a two-word orphan on the second line. The measure widens to
        1040px because the credits line is longer than the one it replaced and
        was breaking to three lines at 900.
      */}
      <p className="mx-auto max-w-[1040px] text-balance">{BRAND_COMMUNITY_LINE}</p>
    </div>
  );
}
