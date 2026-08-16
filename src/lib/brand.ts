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

/*
  RETIRED WITH THE PAGES THAT RENDERED THEM (brief_home_rebuild_08_09):
  BRAND_COMMUNITY_LINE (the Credits ribbon), BRAND_MANIFESTO (the old Punchout
  section), and the three BRAND_HERO_SUBHEAD_* strings, which HERO_COPY below
  replaces. All five are one `git show` away if a surface wants them back —
  keeping exported strings nothing renders is how a copy module turns into an
  archive nobody trusts.
*/

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
 * THE MONEY LINE — the badge, unpacked. Used where somebody is about to act
 * (above the sign-up chips) and where the community story starts, because those
 * are the two places the sequence needs spelling out rather than gesturing at.
 */
export const BRAND_MONEY_LINE =
  "Learn new skills. Join the community. Connect with the expert. Get paid.";

/**
 * THE DESCRIPTOR — what Panameer is, for someone who has never heard of it.
 * Carries both sides of the marketplace deliberately: a page that only names
 * the experts reads as a directory, and one that only names the businesses
 * reads as a staffing agency.
 */
export const BRAND_DESCRIPTOR =
  "The home for Enterprise Systems + AI experts — and the businesses that need them.";

/**
 * THE ERP POSITIONING LINE.
 *
 * A positioning line, not section copy — the same class as `BRAND_BADGE` and
 * `BRAND_DESCRIPTOR`, and it lives here for the same reason: it renders on the
 * home page's ERP Integration section today and becomes the mainstay of the
 * Enterprise page next, so a re-wording has to be one edit that cannot
 * half-land.
 *
 * "The modern ERPs" is plural on purpose. Oracle is the wedge and the diagram
 * names Oracle Cloud, but the claim being made is about the SPACE BETWEEN
 * systems of record — which is only interesting if there is more than one.
 */
export const BRAND_ERP_TAGLINE = "Automating the space between the modern ERPs.";

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
// Every string the buyer `/` and seller `/find-work` pages render lives
// here, lifted verbatim from the approved mockups. The brief is explicit that
// new copy belongs in this module rather than inline in components, and the
// reason is the one this file has always had: copy typed into a component is
// copy that gets re-worded in one place and not the other.
//
// Grouped by section, in page order, so a section's words can be read without
// opening the component that renders them.
// ---------------------------------------------------------------------------

/** The hero, per audience. Buyer is `/`; seller is `/find-work`. */
export const HERO_COPY = {
  buyer: {
    kicker: "Continuous Transformation",
    /*
      brief_public_pages_ia — this hero now only ever renders on /hire-talent,
      so the subhead speaks to somebody who has already decided to hire rather
      than to a cold visitor who has not.
    */
    subhead:
      "Search real, rated experts by the system they actually run. Engage them " +
      "for two hours or six months — one contract, one payment, no employment " +
      "risk.",
    searchPlaceholder: "Describe what you need done…",
    searchCta: "Search →",
    aiHint:
      "Describe it in a sentence or drop a document — AI drafts your scoped Work Request.",
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
    /*
      WS-5 — "Be your own brand" is bound WHOLE.

      Round 1 bound only "your\u00A0own", which held that pair and moved the
      break to "own / brand" — a bind relocates a break, it does not remove
      one, so binding half a phrase just picks a different place to cut it.
      All four words are bound now.
      `text-balance` evens the LINE LENGTHS; it has no opinion about where in a
      phrase the break lands, and at every sensible measure this sentence split
      between "Be your" and "own brand". Widening the container just moves
      which phrase gets cut. A non-breaking space is the only fix that holds at
      every width, including the ones a phone picks.
    */
    subhead:
      "Find consistent work. Break the hourly ceiling. " +
      "Be\u00A0your\u00A0own\u00A0brand — we handle everything that isn't the work.",
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
  headline: "Three ways to get the work done.",
  /*
    WS-5 — "honest\u00A0comparison" is bound, and the em dash deliberately is
    NOT. `text-balance` evens line LENGTHS and has no opinion about where
    inside a phrase the break falls, so this split between "honest" and
    "comparison"; binding the pair fixes that.

    ⚠ BINDING THE DASH TOO MADE IT WORSE, which is worth recording because the
    instinct is to bind more. "honest comparison —" as one unit no longer fit
    beside "You have options. Here's the", so the whole unit wrapped and line
    one ended on the article. A bind can only ever move a break; it cannot
    create room.
  */
  lead: "You have options. Here's the honest\u00A0comparison — and where Panameer fits.",
  ways: [
    {
      tag: "Go it alone",
      title: "Hire an independent",
      /*
        ⚠ NEVER "cheaper" — not even about the alternative
        (`panameer_virtual_firm_identity.md`). The moment price framing appears
        anywhere on the page, the page is competing on price, and the comparison
        the reader then runs is Panameer against offshore. The DIY card's real
        argument was never the invoice anyway: it is that the invoice is the
        only thing that is smaller.
      */
      blurb: "The smallest invoice — and you carry everything else.",
      points: [
        { ok: false, text: "Unvetted, no shared ratings" },
        { ok: false, text: "You paper every contract" },
        { ok: false, text: "Employment & compliance risk on you" },
      ],
    },
    {
      tag: "The big firm",
      title: "Call a large consultancy",
      blurb: "Safe, but you pay for the pyramid.",
      points: [
        { ok: false, text: "2–3× markup on the same expert" },
        { ok: false, text: "Senior in the pitch, analyst on delivery" },
        { ok: true, text: "Risk transfer & one contract" },
      ],
    },
    {
      tag: "Panameer",
      /*
        Bound on both sides of the break: "direct —" so the dash cannot start a
        line, and "with a safety net" so the tail stays whole. The only break
        left is between them, which is the one place this title should break.
      */
      title: "Go direct\u00A0— with\u00A0a\u00A0safety\u00A0net",
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
  /*
    WS-4 — the eyebrow names the VALUE, per audience, where it used to count
    the steps. "Four Steps, Start to Settle" described the graphic underneath
    it, which the graphic already does; this says who the four steps are for.
  */
  eyebrow: {
    buyer: "How Panameer Creates Value for Service Buyers",
    provider: "How Panameer Creates Value for Service Providers",
  },
  headline: "Together, we improve outcomes and incomes.",
  lead: {
    buyer:
      "Learn, connect, create, and settle — all\u00A0in\u00A0one\u00A0place, on one fully integrated platform.",
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
        // "our", never "your" — the resources come THROUGH Panameer, QA'd and
        // managed by the coordinator. See the identity doc.
        cap: "Create With Our Experts",
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
        /*
          NOT "our experts" here, and that is the point of reading the rule
          rather than running find-and-replace: this is the PROVIDER page, where
          the provider IS the expert. "Deliver with our experts" would tell a
          consultant that somebody else does their work. The banned phrase is
          removed by rewriting the sentence, not by flipping the pronoun.
        */
        body: "Deliver your way, augmented by your own AI. We handle the paperwork.",
      },
      {
        word: "Settle",
        cap: "Get Paid",
        body: "One settlement, on time. No chasing invoices, no back-office.",
      },
    ],
  },
} as const;

/*
  Buyer §4 — the ERP punchout loop.

  WS-3 — THE VOCABULARY RULE, and this section is where it bites hardest
  because both kinds of noun appear in the same five cards.

    Panameer transactions are NAMED OBJECTS and take capitals: Work Order,
    Work Request. They are things this platform creates and the user will see
    under those names in the product.

    Generic ERP transactions are COMMON NOUNS and stay lowercase: purchase
    order, requisition, service receipt. They belong to the customer's ERP,
    not to us, and capitalising them would quietly claim them.

  "PO" keeps its capitals as an acronym. The step TITLES are sentence case, so
  "Service receipt" and "Requisition" are capitalised as the first word of a
  title rather than as proper nouns — which is why "Work Order" mid-title is
  the one that stays fully capitalised.
*/
export const PUNCHOUT_COPY = {
  eyebrow: "Extend Your ERP",
  headline: "Punch out for talent — not just parts.",
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
      title: "Find & hire",
      body: "Search, interview, and select your expert.",
    },
    {
      where: "Your ERP",
      side: "erp",
      title: "Approve & PO",
      body: "Back in your ERP for approval and a purchase order.",
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
      title: "Service receipt",
      body: "Billing returns as a service receipt — ready to match and pay.",
    },
  ],
} as const;

/** Buyer §5 — what procurement gets. The two "money" cells lead. */
export const VALUE_STACK = {
  eyebrow: "What Procurement Gets",
  headline:
    "The wrapper that made the big firm feel safe — without the firm, or the expense.",
  cells: [
    {
      mark: "◆",
      money: true,
      title: "Direct pricing",
      body: "Pay the expert's rate — not a 2–3× firm markup.",
    },
    {
      mark: "◆",
      money: true,
      title: "Zero risk to connect",
      body: "Connecting to Panameer is free. Don't use it, don't pay.",
    },
    {
      mark: "01",
      money: false,
      title: "One contract",
      body: "Sign once with Panameer, not with every provider.",
    },
    {
      mark: "02",
      money: false,
      title: "Cross-customer ratings",
      body: "Every expert vetted by the whole community.",
    },
    {
      mark: "03",
      money: false,
      title: "One monthly payment",
      body: "A single settlement for all your providers.",
    },
    {
      mark: "04",
      money: false,
      title: "No employment risk",
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
      { text: "AI-drafted Work Requests", soon: false },
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
  headline: "The two hardest parts of going independent — solved.",
  pains: [
    {
      title: "Find consistent work.",
      body: "End the feast-or-famine. Buyers connect to the platform — and to you. The pipeline comes to you.",
    },
    {
      title: "Break the hourly ceiling.",
      body: "Stop trading hours for dollars. Sell courses, packages, and consults alongside your work — and earn off the clock.",
    },
  ],
} as const;

/*
  Seller §3 — every way to sell expertise.

  WS-6 — CUT TO FRAGMENTS. Scott's note is that /find-work reads as
  run-ons. These card bodies were full sentences with a subordinate clause
  each; in a five-across grid at 12.5px that is four lines per card and the row
  becomes a wall. A fragment per card is the right density for a scan, and the
  detail belongs on the page that sells each one.
*/
export const OMNI_CHANNEL = {
  eyebrow: "Omni-Channel Monetization",
  headline: "Sell your expertise every way there is.",
  lead: "One profile, many revenue streams. Productize once, sell many.",
  cards: [
    { icon: "$", title: "Consultations", body: "Bite-size, on-demand advice." },
    { icon: "▤", title: "Courses", body: "Guided paths that end in a certification." },
    { icon: "◫", title: "Packages", body: "Pre-scoped services, off the shelf." },
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
  headline: "Stop being the marked-up resource.",
  main: {
    title: "Be your own brand.",
    body: "The big firm hires people like you, marks you up, and resells you — anonymously. Go direct.",
    points: [
      "Your name, your rating, your rate — portable and yours",
      "Keep the value the middleman used to skim",
      "Contracts, compliance, and employment risk carried by the platform",
      "Become a vetted, certified Panameer expert — a lead magnet",
    ],
  },
  bionic: {
    tag: "The Bionic Consultant",
    title: "Bring your AI to the table.",
    body: "Bring the AI that makes you faster. Panameer helps you package and sell it — so clients see the edge you already have.",
  },
} as const;

/**
 * The closing band, per audience.
 *
 * ⚠ THE HOME HAS ITS OWN (brief_home_polish_method WS-2). The buyer band ends
 * on "Describe what you need" + "Talk to us" — two asks, neither of which is
 * one of the home's two exits. On Hire Talent that is exactly right, because
 * the reader arrived intending to hire. On the home it is a third and fourth
 * competing action at the very bottom of a funnel whose entire job is the
 * assessment.
 */
export const CLOSING_CTA = {
  home: {
    headline: "See where you stand. Free.",
    body: "A maturity read across the processes you run, in minutes — then a coordinator who walks you through it.",
    primary: "Start the free assessment →",
    secondary: "Meet our experts",
  },
  buyer: {
    headline: "Go direct. Keep transforming.",
    body: "Free to connect, pay only when you engage. Describe what you need and meet the expert who's already done it.",
    primary: "Describe what you need →",
    secondary: "Talk to us",
  },
  provider: {
    headline: "Build your profile in minutes.",
    body: "Drop in your background — AI drafts your portfolio. List your first service and get found.",
    primary: "Build your profile",
    secondary: "See how earning works →",
  },
} as const;

/** Buyer §7 — the assessment framework. Presentational; the CTA is the funnel. */
export const ASSESSMENT_COPY = {
  eyebrow: "See Where You Stand on AI Adoption",
  headline: "Assess your adoption by capability domain",
  /*
    WS-3 — StratERP density. The lead ran to two sentences of throat-clearing
    ("Transformation isn't slowing down — it's accelerating") before reaching
    the offer. A firm presenting its method states the method; the reader did
    not come for a trend observation.
  */
  leadStrong: "Every process you run, scored.",
  lead: "Where you sit today, paper to AI-driven — and the gaps worth closing first.",
  cta: "See where you stand →",
  ctaSub: "Sign in to be first in line.",
} as const;

// ---------------------------------------------------------------------------
// THREE PAGES, ONE AUDIENCE EACH (brief_public_pages_ia).
//
// The home used to do all three jobs at once — talent search, buyer value and
// the assessment — so every visitor met two thirds of a page written for
// somebody else. Each page now has one audience and one job, and the content
// below is the same content re-allocated, not new claims.
//
// VOICE: second person, active, what YOU get. "You learn where you stand",
// never "we teach you". The distinction is not stylistic — "we teach" describes
// our activity and leaves the reader working out what it buys them.
// ---------------------------------------------------------------------------

/**
 * THE FOUR BEATS, per page.
 *
 * Learn · Connect · Create · Settle is the through-line on all three pages, but
 * it means something different to each audience, so each page states its own
 * version rather than repeating one generic set. On the HOME the "Learn" beat
 * IS the assessment — that is the page's whole job.
 */
export const PAGE_BEATS = {
  home: {
    eyebrow: "Learn. Connect. Create. Settle.",
    headline: "What you get, end to end.",
    beats: [
      {
        beat: "Learn",
        body: "Where your operations rank, paper to AI-driven. Free.",
      },
      {
        beat: "Connect",
        body: "To our vetted experts, matched to the gaps you found.",
      },
      {
        beat: "Create",
        body: "Your roadmap, managed with the tools big firms charge for.",
      },
      {
        beat: "Settle",
        body: "One contract, one payment, on delivery.",
      },
    ],
  },
  hire: {
    eyebrow: "Learn. Connect. Create. Settle.",
    headline: "How hiring works here.",
    beats: [
      {
        beat: "Learn",
        body: "Who's available — and see their real, rated past work before you commit.",
      },
      {
        beat: "Connect",
        body: "Plan, collaborate and consult with them directly. No firm in the middle.",
      },
      {
        beat: "Create",
        body: "Hire them to build it — a two-hour consult or a six-month deployment, same low friction.",
      },
      {
        beat: "Settle",
        body: "From inside your ERP — requisition, PO, Work Order, service receipt — or direct on the web. One contract, one payment.",
      },
    ],
  },
  work: {
    eyebrow: "Learn. Connect. Create. Settle.",
    headline: "How you earn here.",
    beats: [
      {
        beat: "Learn",
        body: "Stay current with free training that keeps your skills sharp and your profile ranked.",
      },
      {
        beat: "Connect",
        body: "Directly to buyers. Be found, be your own brand — no anonymous markup.",
      },
      {
        beat: "Create",
        body: "Every way there is: consultations, courses, packages, engagements, retainers. Productize once, sell many.",
      },
      {
        beat: "Settle",
        body: "Get paid on delivery. One settlement, no back office, no employment risk on you.",
      },
    ],
  },
} as const;

/** HOME hero — the assessment front door. */
export const HOME_HERO = {
  kicker: "See where you stand on AI adoption",
  headline: "See where your business really stands — paper to AI-driven.",
  subhead:
    "A free operating-maturity assessment, in minutes. All it costs is your email.",
  cta: "Start the free assessment",
  ctaSub: "Sign in to be first in line.",
  /*
    ⚠ HONEST FRAMING, and it is load-bearing. There is no scoring engine behind
    this yet, so the hero says what the assessment IS — a framework read across
    the processes you run — rather than implying a live measurement. The
    dashboard beside it is labelled "Sample Read" for the same reason.
  */
  /*
    WS-3 — halved. It said the same thing twice ("what you'll be scored
    against" / "not your data") and the dashboard beside it already carries a
    "Sample Read" chip and its own caption. Honesty does not get more honest by
    being repeated; it gets skipped.
  */
  frameworkNote: "Sample read — the framework below is what you're scored against.",
} as const;

/**
 * HOME — OUR METHOD, the section that proves this is a firm.
 *
 * ── WHY IT IS "METHOD" AND NOT "ROADMAP" ─────────────────────────────────────
 *
 * Panameer's positioning is a VIRTUAL FIRM, not a marketplace
 * (`panameer_virtual_firm_identity.md`): a marketplace has no point of view —
 * it lists people and leaves you to it. A firm has a method, produces
 * deliverables, and puts a human at the point of accountability. This section
 * is where that claim is made or lost, so it is written as the method rather
 * than as a timeline of activity.
 *
 * EVERY CARD NAMES AN OUTPUT. "Score and prioritise" is us describing our
 * activity; "your maturity read + a prioritized gap list" is a thing the client
 * receives. Firms are bought on deliverables, and an activity list is what a
 * marketplace would show.
 *
 * TIME LABELS STAY. "Weeks 1–2" sells to an owner who wants to know when;
 * "Analyze / Design / Deploy" is the AIM method's own vocabulary and belongs
 * back-office. The method is the moat — it does not need to be recited to be
 * felt.
 *
 * THE LAST CARD CLOSES THE LOOP. Re-score plus an alert when a new solution
 * lands for one of your gaps is what makes "continuous transformation" literal
 * instead of a tagline; a four-step plan that ends is a project, and a project
 * is a one-off.
 */
export const ROADMAP_COPY = {
  eyebrow: "Our method",
  headline: "The assessment is the first step of a method.",
  lead: "Every gap becomes a deliverable, with the expertise attached.",
  /*
    ⚠ ILLUSTRATIVE. The AIM tool is a later brief; this is the shape of what an
    assessment produces, not a plan from anybody's data. Said on the page.
  */
  note: "Illustrative — an example sequence.",
  /*
    THE HUMAN ANCHOR, and it is the most important line in the section.
    Everything above it could be automated; a named senior person who translates
    the read and stands behind the quality of the consultants is what makes this
    a firm rather than software that sold you something. The page PROMISES the
    coordinator — assignment logic is a later build.
  */
  coordinator:
    "When your assessment completes, a coordinator is assigned — a senior person who translates the read, scopes the work, and stands behind the experts on it.",
  steps: [
    {
      phase: "Weeks 1–2",
      title: "Your maturity read",
      body: "A scored read of every process you run, and a prioritized gap list.",
    },
    {
      phase: "Weeks 3–8",
      title: "Quick-win packages",
      body: "The gaps that close in days — fixed price, a named expert on each.",
    },
    {
      phase: "Quarter 2",
      title: "A scoped rebuild",
      body: "Your weakest process, rebuilt to a written scope with a named expert.",
    },
    {
      phase: "Ongoing",
      title: "Re-score, and stay ahead",
      body: "Watch the number move — and get an alert when a new solution lands for one of your gaps.",
    },
  ],
} as const;

/**
 * HOME — the condensed comparison, which must CLOSE ON TALENT.
 *
 * Every value block on the home ends by pointing at the experts, because the
 * home's job is to hand a warmed-up buyer to Hire Talent. A value section that
 * ends on its own argument is a dead end on a funnel page.
 */
export const HOME_TEASER = {
  eyebrow: "The third way",
  headline: "You have options. Here's the honest comparison.",
  close: "…and here are the vetted experts who close your gaps.",
  closeCta: "Meet the experts",
} as const;

/** HIRE TALENT hero. */
export const HIRE_HERO = {
  /*
    The eyebrow must not restate the headline. First pass set both to "Hire
    pre-vetted experts, direct" and the hero read the same sentence twice in
    two type sizes — the eyebrow's job is to say who this page is for, so it
    does that instead.
  */
  kicker: "For teams ready to hire",
  headline: "Hire pre-vetted experts, direct.",
  subhead:
    "Search real, rated experts by the system they actually run. Engage them for two hours or six months — one contract, one payment.",
} as const;

/** HIRE TALENT — the matching engine, described honestly. */
export const AI_MATCH_COPY = {
  eyebrow: "AI matching",
  headline: "Post what you need. Get ranked, vetted experts.",
  lead: "Your Work Request is matched against every expert's actual work history — the systems they ran, how deep, how recently — and comes back ranked.",
  steps: [
    { label: "Your Work Request", body: "Say what you need, in your own words." },
    { label: "Matched on real history", body: "Against dated engagements, not a self-scored checklist." },
    { label: "Ranked by depth and recency", body: "Deep and current beats touched-it-once." },
  ],
  note: "Ranking runs on each expert's dated work history — see how a profile is built on Find Work.",
} as const;

/** FIND WORK — build your profile, and what it becomes. */
export const PROFILE_VIZ_COPY = {
  eyebrow: "Bring your résumé alive",
  headline: "Your profile builds itself from your work history.",
  lead: "Drop in your résumé. Each job is read for the system it ran on and the modules you used — and your profile becomes a weighted picture of what you actually do.",
  centerOfGravity: "Where your experience actually sits",
  note: "Example profile — yours is built from your own résumé.",
} as const;

/** Shared caption for the product-screenshot bands. */
export const APP_SHOTS_COPY = {
  hire: {
    eyebrow: "Inside the product",
    headline: "See the tools you'd be using.",
    lead: "Work Requests, matched experts, contracts and settlement — the buyer side, end to end.",
  },
  work: {
    eyebrow: "Inside the product",
    headline: "See what you'd be working in.",
    lead: "Your profile, incoming work, packages and payouts — the provider side, end to end.",
  },
} as const;
