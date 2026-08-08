/**
 * THE BRAND VOICE, in one module (brief_brand_tagline_rollout).
 *
 * Source of truth: `approach_to_market.md` §3. Supersedes the E160/E182
 * tagline copy, which said "The Oracle Cloud Talent, Training & Services
 * Marketplace" — narrower than the positioning now is, and using the one word
 * this system deliberately keeps out of display copy.
 *
 * WHY EVERY STRING LIVES HERE. A tagline repeated in four files becomes four
 * different taglines: the marketing hero gets re-worded, the onboarding header
 * doesn't, and six months later nobody can say which one is current. Four
 * surfaces render these — the marketing home, the onboarding shell, the
 * community hub and the page metadata — and all four import from this file, so
 * a re-wording is one edit and cannot half-land.
 *
 * EXTENDED, NOT REPLACED, BY A SECOND MODULE. The brief offers
 * `brand-copy.ts` or reuse of the existing constant. Adding a second brand-copy
 * file beside this one would recreate the exact duplication the rule exists to
 * prevent, so the strings join the module that already held the tagline and had
 * no dependencies of its own.
 */

/**
 * THE BADGE — the headline. Five verbs now, in the order they happen to a
 * person: they learn something, they meet people, they MAKE something, they get
 * paid — together.
 *
 * The third beat names the part of the arc the four-verb version skipped:
 * between meeting people and being paid, the work itself happens, and a badge
 * that goes straight from Connect to Settle reads like a referral fee rather
 * than a craft.
 *
 * E065 — THE FOURTH BEAT IS "SETTLE", NOT "GET PAID". The badge has to read
 * from both sides of the marketplace, and "Get Paid" only reads from one: a
 * buyer scanning four verbs hits the fourth and finds it is about somebody
 * else's outcome. "Settle" is what happens between the two of them, and it is
 * true whichever end you are standing at.
 *
 * THE MONEY DID NOT LEAVE, IT MOVED TO THE DESCRIPTIONS. "Settle" alone is
 * bloodless — nobody's motivation is settlement — so every place the beat is
 * unpacked still says get paid, or pay, in plain words. The beat is the label;
 * the caption underneath is where the money is named.
 *
 * E050 — AND THE THIRD IS "BUILD", NOT "CREATE". Both name that gap; they do not name it
 * the same way. "Create" is the word for making something that did not exist —
 * art, content, a company — and this platform's third beat is someone
 * implementing Payables for a manufacturer. "Build" is what the people doing
 * that work call it, it is the verb the enterprise-systems world already uses,
 * and it sits with Learn and Connect without changing register.
 *
 * PROVISIONAL — Scott's "start there". It may shorten again, which is exactly
 * why nothing types this string: it renders in the marketing hero and the
 * header lockup from here, so a re-word is one edit and cannot half-land.
 */
export const BRAND_BADGE = "Learn. Connect. Build. Settle. Together.";

/**
 * THE BADGE, HERO LENGTH — four beats, no "Together" (D1, E016.2a).
 *
 * At 60px the five-beat badge is the entire hero: it wraps to three lines, and
 * "Together." lands alone on the third, which is how a rallying word turns into
 * a widow. The hero already has to carry a descriptor, a search control and a
 * row of tags underneath, and E016.2c wants the whole block MUCH shorter.
 *
 * "Together" is not dropped from the brand — it moved to where it can be read
 * as a sentence rather than skimmed as a headline: the ribbon above the hero
 * now ends on it (BRAND_COMMUNITY_LINE), and BRAND_BADGE below keeps the full
 * five beats for every other surface.
 */
export const BRAND_BADGE_SHORT = "Learn. Connect. Build. Settle.";

/**
 * THE RIBBON — the strip across the top of the marketing home (E016.3 → E039).
 *
 * It has held three things. First a borrowed promo ("the top 1% of talent on
 * Business Plus"), then the manifesto, then the "anyone can" community line.
 * This one names the mechanism the other two only gestured at: Community
 * Credits, what earns them and what spends them.
 *
 * ⚠ SHIPPED AS PRE-LAUNCH VISION, KNOWINGLY. Credits are not functional —
 * `getCreditsSummary` returns a hard zero with `pending: true` and no surface
 * awards any. Nothing on this page can earn or spend one today.
 *
 * That is a deliberate call rather than an oversight, and it rests on the
 * "Panameer is in active development" banner sitting directly ABOVE this strip:
 * a visitor reads "you're early, accounts and data may be reset" and then reads
 * this. In that order it is a roadmap. Without the banner it would be a false
 * promise, so the two are coupled — if SITE_STATUS ever flips to "live" while
 * credits are still inert, this line has to change in the same commit.
 *
 * See also AccountPitch, which makes the opposite call for the same feature:
 * there the claim sits alone at the moment someone hands over an email, so
 * Credits are future-tense there and certifications lead.
 */
export const BRAND_COMMUNITY_LINE =
  "Earn Community Credits for building your profile, selling services, and " +
  "answering work — spend them learning, connecting, proposing, and " +
  "collaborating.";

/**
 * THE MONEY LINE — the badge, unpacked. Used where somebody is about to act
 * (above the sign-up chips) and where the community story starts, because those
 * are the two places the sequence needs spelling out rather than gesturing at.
 */
export const BRAND_MONEY_LINE =
  "Learn new skills. Join the community. Connect with the expert. Get paid.";

/**
 * THE HERO SUBHEAD — one line per side of the toggle (E031).
 *
 * SEPARATE FROM BRAND_DESCRIPTOR, and that is the point. The descriptor names
 * both sides of the marketplace in one sentence ("…experts — and the businesses
 * that need them"), which is right where nobody has told us who they are: the
 * footer, About, the onboarding shell. The hero is the one place the visitor
 * HAS told us — they just pressed "I Want to Hire" or "I Want to Work" — and
 * answering a stated intent with a both-sides sentence throws that away.
 *
 * So the descriptor stays exactly as it is and keeps its four callers. These
 * two are hero-only.
 *
 * "ENTERPRISE SYSTEMS AND AI" IS CAPITALIZED in both, because it is the
 * category this product claims, not a description of it — the same reason
 * BRAND_DESCRIPTOR and SEO_TITLE capitalize it. Spelled "and" rather than the
 * descriptor's "+": these are sentences someone reads, and "+" is a logo
 * treatment.
 */
/**
 * The combined landing's opening line (E051).
 *
 * `/` forks rather than sells, so its subhead has to be true of both sides
 * without being about neither. It names the market and the two things people
 * come to do in it, and hands off to the chooser below.
 *
 * E072 — SHORTENED TO FIX A BREAK, not to say anything different. The previous
 * wording ("hire the experts who do it, or get hired…") balanced onto two lines
 * that split after "hire", stranding the verb at the end of line one where it
 * read as the start of a phrase that never arrived. `text-balance` was working
 * correctly — the sentence simply had no good split at that length. "Hire an
 * expert" is four characters shorter and moves the break to the comma, which is
 * where the sentence already pauses.
 */
export const BRAND_HERO_SUBHEAD_NEUTRAL =
  "The home for Enterprise Systems and AI work — hire an expert, or get hired " +
  "for what you do best.";

export const BRAND_HERO_SUBHEAD_HIRE =
  "Hire the world's best Enterprise Systems and AI talent to improve the " +
  "performance of your business today.";

export const BRAND_HERO_SUBHEAD_WORK =
  "Get hired for the Enterprise Systems and AI work you do best — and get paid.";

/**
 * THE DESCRIPTOR — what Panameer is, for someone who has never heard of it.
 * Carries both sides of the marketplace deliberately: a page that only names
 * the experts reads as a directory, and one that only names the businesses
 * reads as a staffing agency.
 */
export const BRAND_DESCRIPTOR =
  "The home for Enterprise Systems + AI experts — and the businesses that need them.";

/** THE MANIFESTO — the why, not the what. Sits with the differentiator pitch. */
export const BRAND_MANIFESTO =
  "The world's gotten adversarial. Let's build something together.";

/**
 * SEO ONLY — the single place "marketplace" is allowed.
 *
 * It is the word people TYPE INTO A SEARCH BOX and not the word the product
 * says about itself: display copy positions Panameer as "Enterprise Systems +
 * AI", metadata has to match the query. Keeping the two apart is the whole
 * distinction, and keeping them in one file is what stops a future edit
 * quietly promoting the keyword into a headline.
 */
export const SEO_TITLE =
  "Panameer — The Enterprise Systems + AI services marketplace";

export const SEO_DESCRIPTION =
  "Learn new skills, join the community, connect with the expert, get paid. " +
  "Panameer is the Enterprise Systems + AI services marketplace — hire vetted " +
  "experts, or connect your ERP and search, request, order and settle services " +
  "without leaving your system of record.";
