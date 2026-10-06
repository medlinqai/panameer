
export const BRAND_BADGE = "Learn. Connect. Create. Settle. Together.";

export const BRAND_BADGE_SHORT = "Learn. Connect. Create. Settle.";

export const BRAND_MONEY_LINE =
  "Learn new skills. Join the community. Connect with the expert. Get paid.";

export const BRAND_DESCRIPTOR =
  "Connecting buyers and sellers of Oracle ERP-related services.";

export const BRAND_ERP_TAGLINE =
  "Automating the space between your Oracle systems.";

export const ASSESSMENT_PRODUCT = "Optimization Assessment";

export const assessmentProductFor = (process: string) =>
  `${process} ${ASSESSMENT_PRODUCT}`;

export const SEO_TITLE =
  "Panameer — The Enterprise Systems + AI services marketplace";

export const SEO_DESCRIPTION =
  "Learn new skills, join the community, connect with the expert, get paid. " +
  "Panameer is the Enterprise Systems + AI services marketplace — hire vetted " +
  "experts, or connect your ERP and search, request, order and settle services " +
  "without leaving your system of record.";

// THE MARKETING PAGES (brief_home_rebuild_08_09).

/** The hero, per audience. Buyer is `/`; seller is `/find-work`. */
export const HERO_COPY = {
  buyer: {
    kicker: "Continuous Transformation",
    // brief_public_pages_ia — this hero now only ever renders on /hire-talent
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
    // WS-5 — "Be your own brand" is bound WHOLE.
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

/** The audience toggle's labels. */
export const AUDIENCE_TOGGLE = {
  buyer: "I Hire Experts & Buy Services",
  provider: "I Sell Hourly & Packaged Services",
} as const;

/** Buyer §2 — the honest comparison. Names the PATTERN, never a firm. */
export const THREE_WAYS = {
  eyebrow: "Why Panameer",
  headline: "Three ways to get the work done.",
  // WS-5 — "honest\u00A0comparison" is bound, and the em dash deliberately is
  lead: "You have options. Here's the honest\u00A0comparison — and where Panameer fits.",
  ways: [
    {
      tag: "Go it alone",
      title: "Hire an independent",
      // NEVER "cheaper" — not even about the alternative
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
      // Bound on both sides of the break: "direct —" so the dash cannot start a
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
  // WS-4 — the eyebrow names the VALUE, per audience, where it used to count
  eyebrow: {
    buyer: "How Panameer Creates Value for Service Buyers",
    provider: "How Panameer Creates Value for Service Providers",
  },
  headline: "Together, we improve outcomes and incomes.",
  lead: {
    buyer:
      "Learn, connect, create, and settle — all\u00A0in\u00A0one\u00A0place, on one fully integrated platform.",
    provider:
      "The same platform your buyers use — seen from your side of the table.",
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
        // NOT "our experts" here, and that is the point of reading the rule
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

// Buyer §4 — the ERP punchout loop.
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

/** The AI strip, per audience. */
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
      body: "Stop trading hours for dollars. Sell courses, service products, and consults alongside your work — and earn off the clock.",
    },
  ],
} as const;

// Seller §3 — every way to sell expertise.
export const OMNI_CHANNEL = {
  eyebrow: "Omni-Channel Monetization",
  headline: "Sell your expertise every way there is.",
  lead: "One profile, many revenue streams. Productize once, sell many.",
  cards: [
    { icon: "$", title: "Consultations", body: "Bite-size, on-demand advice." },
    {
      icon: "▤",
      title: "Courses",
      body: "Guided paths that end in a certification.",
    },
    {
      icon: "◫",
      title: "Service Products",
      body: "Pre-scoped services, off the shelf.",
    },
    {
      icon: "⚙",
      title: "Engagements",
      body: "Full deployments, days to months.",
    },
    {
      icon: "✦",
      title: "Mentoring",
      body: "Coach teams before and during the work.",
    },
  ],
} as const;

/** Seller §5 — Go Direct, and the Bionic Consultant. */
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

/** The closing band, per audience. */
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
  // WS-3 — StratERP density. The lead ran to two sentences of throat-clearing
  leadStrong: "Every process you run, scored.",
  lead: "Where you sit today, paper to AI-driven — and the gaps worth closing first.",
  cta: "See where you stand →",
  ctaSub: "Sign in to be first in line.",
} as const;

// THREE PAGES, ONE AUDIENCE EACH (brief_public_pages_ia).

/** THE FOUR BEATS, per page. */
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
        body: "Every way there is: consultations, courses, service products, engagements, retainers. Productize once, sell many.",
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
  // HONEST FRAMING, and it is load-bearing. There is no scoring engine behind
  // WS-3 — halved. It said the same thing twice ("what you'll be scored
  frameworkNote:
    "Sample read — the framework below is what you're scored against.",
} as const;

/** HOME — OUR METHOD, the section that proves this is a firm. */
export const ROADMAP_COPY = {
  eyebrow: "Our method",
  headline: "The assessment is the first step of a method.",
  lead: "Every gap becomes a deliverable, with the expertise attached.",
  // ILLUSTRATIVE. The AIM tool is a later brief; this is the shape of what an
  note: "Illustrative — an example sequence.",
  // THE HUMAN ANCHOR, and it is the most important line in the section.
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
      title: "Quick-win service products",
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

/** HOME — the condensed comparison, which must CLOSE ON TALENT. */
export const HOME_TEASER = {
  eyebrow: "The third way",
  headline: "You have options. Here's the honest comparison.",
  close: "…and here are the vetted experts who close your gaps.",
  closeCta: "Meet the experts",
} as const;

/** HIRE TALENT hero. */
export const HIRE_HERO = {
  // The eyebrow must not restate the headline. First pass set both to "Hire
  kicker: "For teams ready to hire",
  headline: "Hire pre-vetted experts, direct.",
  subhead:
    "Search real, rated experts by the system they actually run. Engage them for two hours or six months — one contract, one payment.",
} as const;

/** THE THREE BLOCK-2 DESTINATION PAGES: PLACEHOLDER HERO COPY */
export const ENTERPRISE_HERO = {
  kicker: "PLACEHOLDER — Enterprise",
  headline: "PLACEHOLDER — headline about ERP integration goes here.",
} as const;

export const WHY_HERO = {
  kicker: "PLACEHOLDER — Why Panameer",
  headline: "PLACEHOLDER — headline about the method and the firm goes here.",
} as const;

export const BUY_SERVICES_HERO = {
  // the rename only keeps the page's own eyebrow from saying "Buy Services" on a
  kicker: "PLACEHOLDER — Shop",
  headline: "PLACEHOLDER — headline about packaged services goes here.",
} as const;

/** HIRE TALENT — the matching engine, described honestly. */
export const AI_MATCH_COPY = {
  eyebrow: "AI matching",
  headline: "Post what you need. Get ranked, vetted experts.",
  lead: "Your Work Request is matched against every expert's actual work history — the systems they ran, how deep, how recently — and comes back ranked.",
  steps: [
    {
      label: "Your Work Request",
      body: "Say what you need, in your own words.",
    },
    {
      label: "Matched on real history",
      body: "Against dated engagements, not a self-scored checklist.",
    },
    {
      label: "Ranked by depth and recency",
      body: "Deep and current beats touched-it-once.",
    },
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
    lead: "Your profile, incoming work, service products and payouts — the provider side, end to end.",
  },
} as const;
