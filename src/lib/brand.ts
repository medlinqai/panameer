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
 * E075 — AND THE THIRD IS "CREATE". FINAL.
 *
 * This beat went Create → Build (E050) → Create, so the reasoning is corrected
 * in place rather than layered. The case for "Build" was register: the work is
 * implementing Payables for a manufacturer, and "build" is what the people who
 * do that call it. True, and too narrow.
 *
 * What decides it is everything the beat has to cover. The third beat is not
 * just delivery — it is the whole of what a seller makes here, which by the
 * Create primer's own diagram includes courses, forums, mentoring and packages
 * alongside implementations. "Build" describes one of those and strains on the
 * rest. "Create" holds all of them.
 *
 * PROVISIONAL — Scott's "start there". It may shorten again, which is exactly
 * why nothing types this string: it renders in the marketing hero and the
 * header lockup from here, so a re-word is one edit and cannot half-land.
 */
export const BRAND_BADGE = "Learn. Connect. Create. Settle. Together.";

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
export const BRAND_BADGE_SHORT = "Learn. Connect. Create. Settle.";

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

// ---------------------------------------------------------------------------
// THE MARKETING PAGES (brief_home_rebuild_08_09).
//
// Every string the buyer `/` and seller `/for-providers` pages render lives
// here, lifted verbatim from the approved mockups. The brief is explicit that
// new copy belongs in this module rather than inline in components, and the
// reason is the one this file has always had: copy typed into a component is
// copy that gets re-worded in one place and not the other.
//
// Grouped by section, in page order, so a section's words can be read without
// opening the component that renders them.
// ---------------------------------------------------------------------------

/** The hero, per audience. Buyer is `/`; seller is `/for-providers`. */
export const HERO_COPY = {
  buyer: {
    kicker: "Continuous Transformation",
    subhead:
      "Keep your Oracle investment evolving — on-demand access to pre-vetted " +
      "experts with 20+ years in your applications. Without the million-dollar " +
      "implementation.",
    searchPlaceholder: "Describe what you need done…",
    searchCta: "Search →",
    aiHint:
      "Describe it in a sentence or drop a document — AI drafts your scoped work request.",
    chips: [
      "Procurement",
      "Supply Chain",
      "Human Capital Mgmt",
      "Finance & Accounting",
      "Enterprise AI",
      "Extend Your ERP with AI",
    ],
  },
  provider: {
    kicker: "Go Direct",
    subhead:
      "Find consistent work and break the hourly ceiling. Be your own brand — " +
      "we carry everything that isn't the work.",
    searchPlaceholder: "Describe your expertise…",
    searchCta: "Find Work →",
    aiHint:
      "Drop your résumé or LinkedIn — AI builds your profile and labels your services.",
    chips: [
      "Oracle Cloud",
      "Financials",
      "Procurement",
      "HCM",
      "Supply Chain",
      "Enterprise AI",
    ],
  },
} as const;

/**
 * The audience toggle's labels.
 *
 * Longer and more literal than the "Hire an Expert / Work & Earn" they replace,
 * because they have to be self-describing in a hero with no surrounding
 * explanation: a first-time visitor reads one line and knows which is them.
 */
export const AUDIENCE_TOGGLE = {
  buyer: "I Hire Experts & Buy Services",
  provider: "I Sell Hourly & Packaged Services",
} as const;

/** Buyer §2 — the honest comparison. Names the PATTERN, never a firm. */
export const THREE_WAYS = {
  eyebrow: "Why Panameer",
  headline: "Three Ways to Get the Work Done.",
  lead: "You have options. Here's the honest comparison — and where Panameer fits.",
  ways: [
    {
      tag: "Go it alone",
      title: "Hire an Independent",
      blurb: "Cheaper, but you carry the load.",
      points: [
        { ok: false, text: "Unvetted, no shared ratings" },
        { ok: false, text: "You paper every contract" },
        { ok: false, text: "Employment & compliance risk on you" },
      ],
    },
    {
      tag: "The big firm",
      title: "Call a Large Consultancy",
      blurb: "Safe, but you pay for the pyramid.",
      points: [
        { ok: false, text: "2–3× markup on the same expert" },
        { ok: false, text: "Senior in the pitch, analyst on delivery" },
        { ok: true, text: "Risk transfer & one contract" },
      ],
    },
    {
      tag: "Panameer",
      title: "Go Direct — With a Safety Net",
      blurb: "The same senior expert, direct. None of the markup.",
      badge: "The third way",
      points: [
        { ok: true, text: "Pre-vetted, cross-customer rated" },
        { ok: true, text: "One contract, one monthly payment" },
        { ok: true, text: "Employment-risk layer built in" },
      ],
    },
  ],
} as const;

/** The four-beat video sequence, framed per audience. */
export const SEQUENCE_COPY = {
  eyebrow: "Four Steps, Start to Settle",
  headline: "Together, We Improve Outcomes and Incomes.",
  lead: {
    buyer:
      "Learn, connect, create, and settle — all in one place, on one fully integrated platform.",
    provider: "The same platform your buyers use — seen from your side of the table.",
  },
  beats: {
    buyer: [
      {
        word: "Learn",
        cap: "Learn About Apps & Tech",
        body: "Know what you're buying before you buy it — the same free paths your providers trained on.",
      },
      {
        word: "Connect",
        cap: "Connect at Every Stage",
        body: "Scope with an expert before you commit, then keep the same people through delivery.",
      },
      {
        word: "Create",
        cap: "Create With Your Experts",
        body: "Agreed scope, tracked in one place — or ordered straight from your ERP.",
      },
      {
        word: "Settle",
        cap: "Pay in One Payment",
        body: "One settlement through Panameer — no contractor paperwork, no compliance or legal exposure.",
      },
    ],
    provider: [
      {
        word: "Learn",
        cap: "Sharpen & Certify",
        body: "Build skills and earn credentials that make you easier to find and trust.",
      },
      {
        word: "Connect",
        cap: "Get Found",
        body: "Buyers connect to the rail — and connect to you. Get matched to work that fits.",
      },
      {
        word: "Create",
        cap: "Do the Work",
        body: "Deliver with your experts, augmented by your own AI. We handle the paperwork.",
      },
      {
        word: "Settle",
        cap: "Get Paid",
        body: "One settlement, on time. No chasing invoices, no back-office.",
      },
    ],
  },
} as const;

/** Buyer §4 — the ERP punchout loop. */
export const PUNCHOUT_COPY = {
  eyebrow: "Extend Your ERP",
  headline: "Punch Out for Talent — Not Just Parts.",
  lead:
    "Your ERP already knows how to buy goods. Panameer extends it to services — " +
    "so hiring an expert runs through the same requisition, PO, and receipt your " +
    "procurement team already trusts. No new system of record.",
  steps: [
    {
      where: "Your ERP",
      side: "erp",
      title: "Requisition",
      body: "Raise a service request — AI drafts the scope — and punch out to Panameer.",
    },
    {
      where: "Panameer",
      side: "pan",
      title: "Find & Hire",
      body: "Search, interview, and select your expert.",
    },
    {
      where: "Your ERP",
      side: "erp",
      title: "Approve & PO",
      body: "Back in your ERP for approval and a Purchase Order.",
    },
    {
      where: "Panameer",
      side: "pan",
      title: "Work Order",
      body: "The PO issues your expert a Work Order to bill against.",
    },
    {
      where: "Your ERP",
      side: "erp",
      title: "Service Receipt",
      body: "Billing returns as a service receipt — ready to match and pay.",
    },
  ],
} as const;

/** Buyer §5 — what procurement gets. The two "money" cells lead. */
export const VALUE_STACK = {
  eyebrow: "What Procurement Gets",
  headline:
    "The Wrapper That Made the Big Firm Feel Safe — Without the Firm, or the Expense.",
  cells: [
    {
      mark: "◆",
      money: true,
      title: "Direct Pricing",
      body: "Pay the expert's rate — not a 2–3× firm markup.",
    },
    {
      mark: "◆",
      money: true,
      title: "Zero Risk to Connect",
      body: "Connecting to Panameer is free. Don't use it, don't pay.",
    },
    {
      mark: "01",
      money: false,
      title: "One Contract",
      body: "Sign once with Panameer, not with every provider.",
    },
    {
      mark: "02",
      money: false,
      title: "Cross-Customer Ratings",
      body: "Every expert vetted by the whole community.",
    },
    {
      mark: "03",
      money: false,
      title: "One Monthly Payment",
      body: "A single settlement for all your providers.",
    },
    {
      mark: "04",
      money: false,
      title: "No Employment Risk",
      body: "Less comp and liability exposure — the model carries it, not your payroll.",
    },
  ],
  reconcile:
    "Free to connect, pay only when you engage — then sign once and every " +
    "engagement after spins up with zero contracting friction.",
} as const;

/**
 * The AI strip, per audience.
 *
 * ⚠ `soon` IS A LABEL AND NOTHING ELSE. Those two items are not built; the tag
 * is the whole honesty mechanism, so it must never become a link.
 */
export const AI_STRIP = {
  lead: "Panameer is AI-native",
  tags: {
    buyer: [
      { text: "AI-drafted work requests", soon: false },
      { text: "AI-built profiles", soon: false },
      { text: "Extend your ERP with AI", soon: false },
      { text: "Price alerts", soon: true },
      { text: "Auto-maturity", soon: true },
    ],
    provider: [
      { text: "AI-built profiles", soon: false },
      { text: "AI-labeled services", soon: false },
      { text: "AI-drafted proposals", soon: false },
      { text: "Price alerts", soon: true },
      { text: "Smart matching", soon: true },
    ],
  },
} as const;

/** Seller §2 — the two pains, led with. */
export const TWO_PAINS = {
  eyebrow: "Why Panameer",
  headline: "The Two Hardest Parts of Going Independent — Solved.",
  pains: [
    {
      title: "Find consistent work.",
      body: "End the feast-or-famine. Buyers connect to the platform — and connect to you. A pipeline that comes to you, instead of the endless hunt for the next gig.",
    },
    {
      title: "Break the hourly ceiling.",
      body: "Stop trading hours for dollars. Sell courses, packages, and consultations alongside your engagements — earn even when you're not on the clock.",
    },
  ],
} as const;

/** Seller §3 — every way to sell expertise. */
export const OMNI_CHANNEL = {
  eyebrow: "Omni-Channel Monetization",
  headline: "Sell Your Expertise Every Way There Is.",
  lead:
    "One profile, many revenue streams. Productize once, sell many — and let " +
    "clients engage you however suits them.",
  cards: [
    { icon: "$", title: "Consultations", body: "Bite-size, on-demand advice — from 15 minutes up." },
    { icon: "▤", title: "Courses", body: "Build guided paths that end in a certification." },
    { icon: "◫", title: "Packages", body: "Pre-scoped services, bought off the shelf." },
    { icon: "⚙", title: "Engagements", body: "Full deployments, days to months." },
    { icon: "✦", title: "Mentoring", body: "Coach teams before and during the work." },
  ],
} as const;

/**
 * Seller §5 — Go Direct, and the Bionic Consultant.
 *
 * ⚠ THE BIONIC PANEL SAYS "BRING YOUR AI", NOT "WE GIVE YOU AI". Panameer does
 * not supply the consultant with a model; it helps them package and label what
 * they already use. The distinction is the difference between a positioning
 * line and a product claim we cannot honour.
 */
export const GO_DIRECT = {
  eyebrow: "Go Direct",
  headline: "Stop Being the Marked-Up Resource.",
  main: {
    title: "Be Your Own Brand.",
    body: "The big firm hires people like you, marks you up, and sells you to the same clients — anonymously. Go direct instead.",
    points: [
      "Your name, your rating, your rate — portable and yours",
      "Keep the value the middleman used to skim",
      "Contracts, compliance, and employment risk carried by the platform",
      "Become a vetted, certified Panameer expert — a lead magnet",
    ],
  },
  bionic: {
    tag: "The Bionic Consultant",
    title: "Bring Your AI to the Table.",
    body: "You bring the AI that makes you faster and better — and Panameer helps you package and sell your existing services under AI labeling, so clients see the edge you already have.",
  },
} as const;

/** The closing band, per audience. */
export const CLOSING_CTA = {
  buyer: {
    headline: "Go Direct. Keep Transforming.",
    body: "Free to connect, pay only when you engage. Describe what you need and meet the expert who's already done it.",
    primary: "Describe What You Need →",
    secondary: "Talk to Us",
  },
  provider: {
    headline: "Build Your Profile in Minutes.",
    body: "Drop in your background — AI drafts your portfolio from it. List your first service and start getting found.",
    primary: "Build Your Profile",
    secondary: "See How Earning Works →",
  },
} as const;

/** Buyer §7 — the assessment framework. Presentational; the CTA is the funnel. */
export const ASSESSMENT_COPY = {
  eyebrow: "See Where You Stand on AI Adoption",
  headline: "Assess Your Adoption by Capability Domain",
  leadStrong:
    "Transformation isn't slowing down — it's accelerating. The only question " +
    "is whether your organization is.",
  lead: "See where you stand across the processes you run — your maturity read is instant.",
  cta: "See Where You Stand →",
  ctaSub: "Sign in to run your assessment",
} as const;
