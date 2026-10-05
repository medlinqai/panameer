// First page (brief_first_page_next_step 2026-10-05): one pure function picks the member's next step.
// Every number shown comes from MemberFacts; a null count is left out, never shown as 0.

export type SellerFacts = {
  published: boolean;
  recruiter: boolean;
  resumeHref: string; // the step they left, for rule 1
  resumeLabel: string | null;
  stepsDone: number | null;
  stepsTotal: number | null;
  months: number | null; // derived from work-history spans; null = no dated history
  projects: number;
  credentials: number | null;
  skills: number;
  colleagues: number;
  sellsPackages: boolean;
  matchingRequests: number | null;
  roleNames: string[];
};

export type BuyerFacts = {
  openRequest: { id: string; title: string; matches: number | null; invited: number | null } | null;
};

export type MemberFacts = {
  firstName: string;
  firstVisit: boolean;
  seller: SellerFacts | null;
  buyer: BuyerFacts | null;
};

export type Tick = { label: string; done: boolean };
export type NextCard = {
  rule: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  title: string;
  line: string;
  cta: { label: string; href: string };
  why: string;
  ticks: Tick[];
};
export type ThenRow = { rule: number; title: string; line: string; link: string; href: string };
export type FirstPage = { greeting: { eyebrow: string; title: string }; card: NextCard; then: ThenRow[] };

/** Lowest experience band: under 3 years of dated work (same edge as the résumé's BEGINNER level). */
export const LOWEST_BAND_MONTHS = 36;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const yearsText = (months: number) =>
  months < 12 ? "less than a year" : plural(Math.floor(months / 12), "year");

export const isLittleExperience = (s: SellerFacts) =>
  (s.months !== null && s.months < LOWEST_BAND_MONTHS) || s.projects < 2;

type Rule = {
  rule: NextCard["rule"];
  matches: (m: MemberFacts) => boolean;
  /** Looser test for the "Then" list (defaults to `matches`). */
  alsoFits?: (m: MemberFacts) => boolean;
  card: (m: MemberFacts) => NextCard;
  then: (m: MemberFacts) => ThenRow[];
};

const sellerLive = (m: MemberFacts) => !!m.seller?.published && !m.seller.recruiter;

const RULES: Rule[] = [
  {
    rule: 1,
    matches: (m) => !!m.seller && !m.seller.published,
    card: (m) => {
      const s = m.seller!;
      const steps = s.stepsDone !== null && s.stepsTotal !== null ? ` You've done ${s.stepsDone} of ${s.stepsTotal} steps.` : "";
      return {
        rule: 1,
        title: "Finish your profile",
        line: s.resumeLabel ? `Pick up where you left off: ${s.resumeLabel}.` : "Pick up where you left off.",
        cta: { label: "Finish My Profile", href: s.resumeHref },
        why: `Buyers can't find you until it's published.${steps}`,
        ticks: [
          { label: "Account created", done: true },
          ...(s.stepsDone !== null && s.stepsTotal !== null ? [{ label: `Steps done: ${s.stepsDone} of ${s.stepsTotal}`, done: s.stepsDone >= s.stepsTotal }] : []),
          { label: "Profile published", done: false },
        ],
      };
    },
    then: () => [],
  },
  {
    rule: 2,
    matches: (m) => sellerLive(m) && isLittleExperience(m.seller!),
    card: (m) => {
      const s = m.seller!;
      const history = s.months !== null ? `Your work history shows ${yearsText(s.months)} of work` : "Your profile has no dated work history yet";
      const proj = s.projects ? `${plural(s.projects, "project")}` : "no projects yet";
      return {
        rule: 2,
        title: "Build your track record in Learn",
        line: "Take a short course and pass its test. Each one adds a verified credential to your profile and raises your Score.",
        cta: { label: "Start in Learn", href: "/learn" },
        why: `${history} and ${proj}. Buyers hire on proof, so a verified credential is the fastest way to get noticed.`,
        ticks: [
          { label: "Profile published", done: true },
          { label: `Projects: ${s.projects}`, done: s.projects >= 2 },
          ...(s.credentials !== null ? [{ label: `Credentials: ${s.credentials}`, done: s.credentials > 0 }] : []),
        ],
      };
    },
    then: () => [{ rule: 2, title: "Build your track record in Learn", line: "A short course and test adds a verified credential.", link: "Learn", href: "/learn" }],
  },
  {
    rule: 3,
    matches: (m) => sellerLive(m) && m.seller!.colleagues === 0,
    card: (m) => {
      const s = m.seller!;
      const strong = [s.projects ? plural(s.projects, "project") : null, s.skills ? plural(s.skills, "skill") : null].filter(Boolean);
      return {
        rule: 3,
        title: "Connect with people you've worked with",
        line: "Invite colleagues from your past projects. Each connection can vouch for your work and shows your profile to their network.",
        cta: { label: "Find Colleagues", href: "/connect" },
        why: `${strong.length ? `Your profile has ${strong.join(" and ")}, but` : "You have"} no colleagues yet. Buyers trust providers others vouch for, so your network wins work faster than applying cold.`,
        ticks: [
          { label: "Profile published", done: true },
          { label: `Projects: ${s.projects}`, done: s.projects > 0 },
          { label: "Colleagues: 0", done: false },
        ],
      };
    },
    then: () => [{ rule: 3, title: "Connect with people you've worked with", line: "Colleagues vouch for you and make you easier to find.", link: "Connect", href: "/connect" }],
  },
  {
    rule: 4,
    matches: (m) => sellerLive(m),
    card: (m) => {
      const s = m.seller!;
      const n = s.matchingRequests;
      return {
        rule: 4,
        title: "Find work",
        line: n ? `${plural(n, "open request")} ${n === 1 ? "matches" : "match"} your skills. Send a proposal on the ones that fit.` : "See what buyers are asking for and send a proposal on the ones that fit.",
        cta: { label: "Find Work", href: "/find-work" },
        why: `Your profile is published and you have ${plural(s.colleagues, "colleague")}.${n !== null ? ` ${plural(n, "open request")} ${n === 1 ? "matches" : "match"} your skills.` : ""}`,
        ticks: [
          { label: "Profile published", done: true },
          { label: `Colleagues: ${s.colleagues}`, done: true },
          ...(n !== null ? [{ label: `Matching requests: ${n}`, done: n > 0 }] : []),
        ],
      };
    },
    then: (m) => {
      const s = m.seller!;
      const n = s.matchingRequests;
      return [
        { rule: 4, title: "Browse open work", line: n ? `${plural(n, "open request")} ${n === 1 ? "matches" : "match"} your skills.` : "See what buyers are asking for.", link: "Find Work", href: "/find-work" },
        ...(s.sellsPackages ? [{ rule: 4, title: "List a service you sell", line: "Package your expertise at a fixed price.", link: "Shop", href: "/my-services" }] : []),
      ];
    },
  },
  {
    rule: 5,
    matches: (m) => !!m.seller?.published && m.seller.recruiter,
    card: (m) => {
      const roles = m.seller!.roleNames;
      return {
        rule: 5,
        title: "Search talent",
        line: "Find providers for the roles you fill and connect with them.",
        cta: { label: "Search Talent", href: "/search" },
        why: roles.length ? `Your profile is live and you recruit for ${roles.join(", ")}. Search shows the providers who fit.` : "Your profile is live. Search shows the providers who fit the roles you fill.",
        ticks: [
          { label: "Profile published", done: true },
          ...(roles.length ? [{ label: `Roles: ${roles.length}`, done: true }] : []),
        ],
      };
    },
    then: () => [{ rule: 5, title: "Search talent", line: "Providers who fit the roles you fill.", link: "Search", href: "/search" }],
  },
  {
    rule: 6,
    matches: (m) => !!m.buyer?.openRequest,
    card: (m) => {
      const r = m.buyer!.openRequest!;
      const title = r.matches ? `${plural(r.matches, "provider")} ${r.matches === 1 ? "matches" : "match"} your request` : "See who matches your request";
      return {
        rule: 6,
        title,
        line: `${r.title ? `"${r.title}." ` : ""}Review the matches and invite the ones you like to send a proposal.`,
        cta: { label: "See Your Matches", href: `/work-requests/${r.id}/invite` },
        why: "You have an open work request. Inviting providers now usually brings proposals within a day.",
        ticks: [
          { label: "Request posted", done: true },
          ...(r.invited !== null ? [{ label: `Providers invited: ${r.invited}`, done: r.invited > 0 }] : []),
        ],
      };
    },
    then: (m) => {
      const r = m.buyer!.openRequest!;
      return [{ rule: 6, title: r.matches ? `${plural(r.matches, "provider")} ${r.matches === 1 ? "matches" : "match"} your request` : "Review your request's matches", line: r.title || "Invite providers to send a proposal.", link: "See matches", href: `/work-requests/${r.id}/invite` }];
    },
  },
  {
    rule: 7,
    matches: (m) => !!m.buyer && !m.buyer.openRequest,
    card: () => ({
      rule: 7,
      title: "Post your first work request (free)",
      line: "Describe the work and we'll show you the providers who match.",
      cta: { label: "Post a Work Request", href: "/create-work" },
      why: "Posting is free; matches show right away.",
      ticks: [
        { label: "Account ready", done: true },
        { label: "Work request posted", done: false },
      ],
    }),
    then: () => [{ rule: 7, title: "Post a work request (free)", line: "Matches show right away.", link: "Post", href: "/create-work" }],
  },
];

/** First matching rule wins the card; the next matching rules (up to 3 rows) make "Then". */
export function nextStep(m: MemberFacts): FirstPage {
  const hits = RULES.filter((r) => r.matches(m));
  const first = hits[0] ?? RULES[6];
  const card = first.card(m);
  // Rule 4's card carries "List a service you sell" with it (first Then row).
  const own = card.rule === 4 ? first.then(m).filter((r) => r.href !== card.cta.href) : [];
  const rows = [...own, ...RULES.filter((r) => r !== first && (r.alsoFits ?? r.matches)(m)).flatMap((r) => r.then(m))];
  // A member who is both seller and buyer always sees their buyer row in "Then".
  const buyerRows = card.rule <= 5 ? rows.filter((r) => r.rule >= 6).slice(0, 1) : [];
  const then = [...rows.filter((r) => !buyerRows.includes(r)).slice(0, 3 - buyerRows.length), ...buyerRows];
  return { greeting: greeting(m, card), card, then };
}

function greeting(m: MemberFacts, card: NextCard): FirstPage["greeting"] {
  const name = m.firstName ? `, ${m.firstName}` : "";
  if (!m.firstVisit) return { eyebrow: "Welcome back", title: `Welcome back${name}.` };
  const eyebrow = m.seller?.published ? "Your profile is live" : card.rule === 6 ? "Your request is posted" : "Welcome";
  return { eyebrow, title: `Welcome to Panameer${name}.` };
}
