import { prisma } from "@/lib/prisma";

/**
 * THE WORK FEED (brief_sp_dashboard WS-B) — the body of the provider dashboard.
 *
 * REAL QUERY OVER A REAL MODEL, CURRENTLY EMPTY. `WorkRequest` and
 * `WorkRequestSkill` exist and this reads them properly; no buyer has posted a
 * work request yet, so every tab returns nothing and the feed shows an honest
 * empty state. That is a data fact, not a stub — the day a buyer posts, cards
 * appear with no code change.
 *
 * TWO OF THE FIVE TABS CANNOT BE ANSWERED YET, and they say so rather than
 * quietly showing the same list as another tab:
 *   Saved Work  — nothing records a provider saving a work request.
 *   Invitations — no work-invitation model exists (CoordinatorInvite is a
 *                 recruiter asking to REPRESENT someone, a different thing).
 * A tab that silently falls back to "all work" is worse than one that admits it
 * has no list: the provider believes they have no saved work when in truth
 * nothing was ever saveable.
 */

export type WorkFeedTab =
  | "best"
  | "recent"
  | "us"
  | "saved"
  | "invitations"
  | "proposals";

/*
  E216 — THE RAIL'S FIND WORK CHILDREN FOLDED IN HERE, de-duplicated.

  The flyout listed five children and this row already had five tabs, and they
  were largely the same views under different names: "Work Requests for My
  Skills" IS Best Matches (this feed ranks by skill overlap), "All Work
  Requests" IS Most Recent, "My Work Requests (Saved)" IS Saved Work, and
  "Invitations to Propose My Rate" IS Invitations. Stacking both would have put
  two rows of near-synonyms on one page.

  Exactly one child described a view this row did not have: My Proposals.
*/
export const WORK_FEED_TABS: { id: WorkFeedTab; label: string }[] = [
  { id: "best", label: "Best Matches" },
  { id: "recent", label: "Most Recent" },
  { id: "us", label: "US Only" },
  { id: "saved", label: "Saved Work" },
  { id: "invitations", label: "Invitations" },
  { id: "proposals", label: "My Proposals" },
];

/** Tabs whose data has no model yet — rendered, but honest about being empty. */
export const UNBACKED_TABS: Record<string, string> = {
  saved: "Saving a work request isn't built yet — nothing records a save.",
  invitations:
    "Buyers can't invite you to propose yet. That needs a work-invitation model, which doesn't exist.",
  proposals:
    "You haven't sent any proposals, and you can't yet — proposing needs a Proposal model, which doesn't exist. Nothing is being hidden here.",
};

export type WorkCard = {
  id: string;
  title: string;
  description: string | null;
  budgetLabel: string | null;
  experienceLevel: string | null;
  duration: string | null;
  location: string | null;
  worksite: string | null;
  roleType: string | null;
  companyName: string | null;
  companyLogoUrl: string | null;
  skills: string[];
  postedAt: string | null;
};

function money(cents: number | null, currency: string): string | null {
  if (cents == null) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

const TITLE_CASE: Record<string, string> = {
  ENTRY: "Entry",
  INTERMEDIATE: "Intermediate",
  EXPERT: "Expert",
  HOURLY: "Hourly",
  FIXED: "Fixed price",
  REMOTE: "Remote",
  ONSITE: "On site",
  HYBRID: "Hybrid",
};

const pretty = (v: string | null | undefined) =>
  v ? (TITLE_CASE[v] ?? v.replace(/_/g, " ").toLowerCase()) : null;

/**
 * One tab's worth of work.
 *
 * BEST MATCHES is ordered by how many of the provider's own skills a request
 * touches — the only ranking signal that exists today, and an honest one. It is
 * computed in memory over the matched set rather than in SQL because the set is
 * bounded by `take` and the alternative is a raw query this early in the
 * model's life.
 */
export async function getWorkFeed(input: {
  tab: WorkFeedTab;
  profileId: string | null;
  query?: string;
}): Promise<WorkCard[]> {
  if (
    input.tab === "saved" ||
    input.tab === "invitations" ||
    input.tab === "proposals"
  ) {
    return [];
  }

  const skillIds = input.profileId
    ? (
        await prisma.providerSkill.findMany({
          where: { provider_profile_id: input.profileId },
          select: { skill_id: true },
        })
      ).map((s) => s.skill_id)
    : [];

  const rows = await prisma.workRequest.findMany({
    where: {
      status: "POSTED",
      ...(input.tab === "us" ? { location_country: { in: ["United States", "USA", "US"] } } : {}),
      ...(input.query
        ? {
            OR: [
              { title: { contains: input.query, mode: "insensitive" } },
              { description: { contains: input.query, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(input.tab === "best" && skillIds.length
        ? { skills: { some: { skill_id: { in: skillIds } } } }
        : {}),
    },
    orderBy: [{ posted_at: "desc" }, { created_at: "desc" }],
    take: 40,
    select: {
      id: true,
      title: true,
      description: true,
      budget_type: true,
      budget_amount_cents: true,
      currency: true,
      experience_level: true,
      duration: true,
      location_country: true,
      worksite: true,
      posted_at: true,
      roleType: { select: { display: true, name: true } },
      buyer: {
        select: { company: { select: { name: true, logo_url: true } } },
      },
      skills: { select: { skill: { select: { id: true, name: true } } } },
    },
  });

  const cards = rows.map((w) => ({
    id: w.id,
    title: w.title || "Untitled work request",
    description: w.description,
    budgetLabel:
      w.budget_amount_cents != null
        ? `${money(w.budget_amount_cents, w.currency)}${w.budget_type === "HOURLY" ? " / hr" : ""}`
        : pretty(w.budget_type),
    experienceLevel: pretty(w.experience_level),
    duration: pretty(w.duration),
    location: w.location_country,
    worksite: pretty(w.worksite),
    roleType: w.roleType?.display ?? w.roleType?.name ?? null,
    companyName: w.buyer.company?.name ?? null,
    companyLogoUrl: w.buyer.company?.logo_url ?? null,
    skills: w.skills.map((s) => s.skill.name),
    postedAt: w.posted_at?.toISOString() ?? null,
    _overlap: w.skills.filter((s) => skillIds.includes(s.skill.id)).length,
  }));

  if (input.tab === "best") {
    cards.sort((a, b) => b._overlap - a._overlap);
  }

  return cards.map(({ _overlap, ...card }) => {
    void _overlap;
    return card;
  });
}
