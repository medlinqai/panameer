import { roleLong } from "@/lib/role-labels";
import { prisma } from "@/lib/prisma";
import { buildBuyerIdentity, scrubTrack, type BuyerIdentity } from "@/lib/work-request-identity";
import { buyerTrackRecord } from "@/lib/buyer-track-record";

export type WorkFeedTab =
  | "best"
  | "recent"
  | "us"
  | "saved"
  | "invitations"
  | "proposals";

export const WORK_FEED_TABS: { id: WorkFeedTab; label: string }[] = [
  { id: "best", label: "Best Matches" },
  { id: "recent", label: "Most Recent" },
  { id: "us", label: "US Only" },
  { id: "saved", label: "Saved Work" },
  { id: "invitations", label: "Invitations" },
  { id: "proposals", label: "My Proposals" },
];

export const UNBACKED_TABS: Record<string, string> = {
  saved: "Not listed yet",
  invitations: "None to show",
  proposals: "None to show",
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
  identity: BuyerIdentity;
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

export const pretty = (v: string | null | undefined) =>
  v ? (TITLE_CASE[v] ?? v.replace(/_/g, " ").toLowerCase()) : null;

export function workBudgetLabel(input: {
  amountCents: number | null;
  minCents: number | null;
  maxCents: number | null;
  currency: string;
  budgetType: string | null;
}): string | null {
  const per = input.budgetType === "HOURLY" ? " / hr" : "";
  if (input.amountCents != null) {
    return `${money(input.amountCents, input.currency)}${per}`;
  }
  if (input.minCents != null && input.maxCents != null && input.maxCents !== input.minCents) {
    return `${money(input.minCents, input.currency)}–${money(input.maxCents, input.currency)}${per}`;
  }
  const one = input.minCents ?? input.maxCents;
  if (one != null) return `${money(one, input.currency)}${per}`;
  return pretty(input.budgetType);
}

/** One tab's worth of work. */
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
      // — THE RANGE THE CURRENT WIZARD ACTUALLY WRITES. Without
      budget_min_cents: true,
      budget_max_cents: true,
      currency: true,
      experience_level: true,
      duration: true,
      location_country: true,
      worksite: true,
      posted_at: true,
      roleType: { select: { display: true, name: true } },
      // — the poster, their company and their account. All of it
      company_visibility: true,
      company_code_name: true,
      p_account_id: true,
      buyer: {
        select: {
          first_name: true,
          last_name: true,
          title: true,
          photo_url: true,
          company: {
            select: {
              id: true,
              name: true,
              country: true,
              vertical: true,
              logo_url: true,
              tin: true,
              // REQUIRED BY . `entityVerificationState` reads
              entity_validated_at: true,
            },
          },
          user: { select: { email_verified: true } },
        },
      },
      skills: { select: { skill: { select: { id: true, name: true } } } },
    },
  });

  // STANDING, IN TWO QUERIES FOR THE WHOLE PAGE
  const accountIds = [...new Set(rows.map((w) => w.p_account_id))];
  const [postedCounts, accounts] = await Promise.all([
    accountIds.length
      ? prisma.workRequest.groupBy({
          by: ["p_account_id"],
          where: { p_account_id: { in: accountIds }, status: "POSTED" },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    accountIds.length
      ? prisma.pAccount.findMany({
          where: { id: { in: accountIds } },
          select: { id: true, created_at: true },
        })
      : Promise.resolve([]),
  ]);
  const postedByAccount = new Map(postedCounts.map((r) => [r.p_account_id, r._count._all]));
  const createdByAccount = new Map(accounts.map((a) => [a.id, a.created_at]));

  // THE FEED IS A PROVIDER SURFACE, so the viewer is never the owner, never an
  const companyIds = [...new Set(rows.map((w) => w.buyer.company?.id).filter((x): x is string => !!x))];
  const tracks = new Map(await Promise.all(companyIds.map(async (id) => [id, await buyerTrackRecord(id)] as const)));
  const identityFor = (w: (typeof rows)[number]) => {
    const id = buildBuyerIdentity({
      person: w.buyer,
      companyVisibility: w.company_visibility,
      companyCodeName: w.company_code_name,
      standing: {
        memberSince: createdByAccount.get(w.p_account_id)?.toISOString() ?? null,
        postedCount: postedByAccount.get(w.p_account_id) ?? 0,
      },
      viewer: { isOwner: false, isAdmin: false, isPlus: false },
    });
    id.track = w.buyer.company ? scrubTrack(tracks.get(w.buyer.company.id) ?? null, id.companyConfidential) : null;
    return id;
  };

  const cards = rows.map((w) => ({
    id: w.id,
    title: w.title || "Untitled work request",
    description: w.description,
    /* ONE DEFINITION, SHARED WITH `/find-work/[id]` (`P2-A8-E664`). */
    budgetLabel: workBudgetLabel({
      amountCents: w.budget_amount_cents,
      minCents: w.budget_min_cents,
      maxCents: w.budget_max_cents,
      currency: w.currency,
      budgetType: w.budget_type,
    }),
    experienceLevel: pretty(w.experience_level),
    duration: pretty(w.duration),
    location: w.location_country,
    worksite: pretty(w.worksite),
    roleType: roleLong(w.roleType?.display ?? w.roleType?.name ?? null),
    companyName: identityFor(w).companyName,
    companyLogoUrl: identityFor(w).companyLogoUrl,
    identity: identityFor(w),
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
