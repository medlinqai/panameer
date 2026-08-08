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
 * THE MANIFESTO THEN HELD THE SLOT, AND NOW DOESN'T (E016.3, superseding E015).
 * "The world's gotten adversarial. Let's build something together." answers WHY
 * Panameer exists, which is the strongest thing on an About page and the
 * weakest thing on a strip a first-time visitor reads in half a second — it
 * assumes they already care. The community line answers what they get, names
 * all four beats, and ends on the word the hero badge gave up when it shortened
 * to four (D1). The manifesto keeps its home in Punchout.
 */
export function Announcement() {
  return (
    <div className="bg-magenta px-4 py-2.5 text-center text-[14.5px] font-semibold text-white">
      {/*
        `text-balance` rather than a fixed width: this is one long sentence that
        WILL wrap on a phone, and balancing it splits the line evenly instead of
        leaving "— together." alone underneath.
      */}
      <p className="mx-auto max-w-[900px] text-balance">{BRAND_COMMUNITY_LINE}</p>
    </div>
  );
}
