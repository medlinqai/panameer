import { BRAND_MANIFESTO } from "@/lib/brand";

/**
 * The announcement bar (E004).
 *
 * WHAT WAS HERE WAS ANOTHER COMPANY'S PITCH: "Get instant access to the top 1%
 * of talent on Business Plus." Three things wrong with one sentence — "top 1%"
 * is the colosseum framing this brand is explicitly not (the voice is
 * "Together", the pillar is lifeline and safety net, not a ranked pile with
 * ninety-nine percent of people underneath it); "Business Plus" is not a
 * Panameer tier and never has been, so the first promise on the front door was
 * for a product nobody can buy; and "instant access to talent" describes a
 * staffing agency rather than a place where people learn, connect and get paid.
 *
 * The manifesto replaces it, from `lib/brand.ts` rather than typed here — it is
 * the one line that says why any of this exists, and the strip across the top
 * of the page is where a visitor is most likely to read a single sentence.
 *
 * NO NEW PROMO COPY WAS INVENTED. The brief allowed removing the bar outright
 * instead; it stays because a magenta band under the header is doing real work
 * for the page's rhythm, and because the manifesto had nowhere on this page
 * above the fold.
 */
export function Announcement() {
  return (
    <div className="bg-magenta px-4 py-2.5 text-center text-[14.5px] font-semibold text-white">
      {BRAND_MANIFESTO}
    </div>
  );
}
