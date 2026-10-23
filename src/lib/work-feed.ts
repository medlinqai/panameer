import { roleLong } from "@/lib/role-labels";
import { prisma } from "@/lib/prisma";
import { meansOffsite, OFFSITE_WORKSITE, searchVariants } from "@/lib/search-synonyms";
import { myWorkRequestIds } from "@/lib/work-home";
import { workFilterWhere, type WorkFilters } from "@/lib/work-filters";
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
  { id: "invitations", label: "Availability Requests" },
  { id: "proposals", label: "My Responses" },
];

export const UNBACKED_TABS: Record<string, string> = {
  saved: "Saving requests isn't open yet.",
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
  /** How many of the viewer's skills the request asks for. */
  matched: number;
  /** PA-E004: the job's Category (drives its art). */
  category?: string | null;
  /** WP-E004: the provider's own proposal on My Proposals / Invitations ("Submitted · $110/hr · start Oct 26 · due Oct 22 1:53 PM"). */
  myProposal?: string | null;
  /** CA-E006: the one-click I Want This Job — rate-card rate and the job's dates (null for a non-provider viewer). */
  oneClick?: { rateCents: number | null; per: string; start: string | null; end: string | null } | null;
};

const PROPOSAL_LABEL: Record<string, string> = { SUBMITTED: "Available", SHORTLISTED: "Shortlisted", AWARDED: "Awarded", NOT_SELECTED: "Not selected", DECLINED: "Not selected", WITHDRAWN: "Withdrawn", DRAFT: "Draft" };
const PER_UOM: Record<string, string> = { HOUR: "/hr", DAY: "/day", WEEK: "/wk", MONTH: "/mo" };

async function myProposals(personId: string, jobIds: string[]): Promise<Map<string, string>> {
  const [props, reqs] = await Promise.all([
    prisma.proposal.findMany({ where: { provider_person_id: personId, job_id: { in: jobIds } }, select: { job_id: true, status: true, currency: true, lines: { take: 1, orderBy: { line_number: "asc" }, select: { unit_price_cents: true, uom: true, basis: true, available_from: true } } } }),
    prisma.proposalRequest.findMany({ where: { provider_person_id: personId, job_id: { in: jobIds } }, select: { job_id: true, status: true, responds_by: true } }),
  ]);
  const fmt = (d: Date, time: boolean) => d.toLocaleString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", ...(time ? { hour: "numeric", minute: "2-digit" } : {}) });
  const out = new Map<string, string>();
  for (const id of jobIds) {
    const p = props.find((x) => x.job_id === id);
    const r = reqs.find((x) => x.job_id === id);
    const l = p?.lines[0];
    const parts = p
      ? [PROPOSAL_LABEL[p.status] ?? p.status, l?.unit_price_cents != null ? `${money(l.unit_price_cents, p.currency)}${l.basis === "RATE" ? PER_UOM[l.uom ?? "HOUR"] ?? "" : ""}` : null, l?.available_from ? `start ${fmt(l.available_from, false)}` : null]
      : r ? [r.status === "DECLINED" ? "You declined" : "Asked — no response yet"] : [];
    if (r?.responds_by && (!p || ["SUBMITTED", "SHORTLISTED"].includes(p.status))) parts.push(`due ${fmt(r.responds_by, true)}`);
    if (parts.length) out.set(id, parts.filter(Boolean).join(" · "));
  }
  return out;
}

function money(cents: number | null, currency: string): string | null {
  if (cents == null) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

const TITLE_CASE: Record<string, string> = {
  // Durations read as words, never enum text ("gt 6 months").
  LT_1_MONTH: "Less Than 1 Month",
  ONE_TO_3_MONTHS: "1 to 3 Months",
  THREE_TO_6_MONTHS: "3 to 6 Months",
  GT_6_MONTHS: "6+ Months",
  ENTRY: "Entry",
  INTERMEDIATE: "Intermediate",
  EXPERT: "Expert",
  HOURLY: "Hourly",
  FIXED: "Fixed price",
  OFFSITE: "Offsite",
  ONSITE: "Onsite",
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
  /** WS-E002: Invitations / My Proposals read the provider's own rows. */
  personId?: string | null;
  /** WS-E007: the list's filter values from the URL. */
  filters?: WorkFilters;
}): Promise<WorkCard[]> {
  if (input.tab === "saved") return [];
  const mine = input.tab === "invitations" || input.tab === "proposals";
  if (mine && !input.personId) return [];
  const ids = mine ? await myWorkRequestIds(input.personId!, input.tab as "invitations" | "proposals") : null;
  if (ids && !ids.length) return [];

  const skillIds = input.profileId
    ? (
        await prisma.providerSkill.findMany({
          where: { provider_profile_id: input.profileId },
          select: { skill_id: true },
        })
      ).map((s) => s.skill_id)
    : [];

  const rows = await prisma.job.findMany({
    where: {
      ...(ids ? { id: { in: ids } } : { status: "OPEN" }),
      // ES-E001: estimate needs never appear in Find Jobs.
      kind: "JOB",
      AND: workFilterWhere(input.filters ?? {}),
      ...(input.tab === "us" ? { location_country: { in: ["United States", "USA", "US"] } } : {}),
      ...(input.query
        ? {
            OR: [
              ...searchVariants(input.query).flatMap((v) => [
                { title: { contains: v, mode: "insensitive" as const } },
                { description: { contains: v, mode: "insensitive" as const } },
              ]),
              ...(meansOffsite(input.query) ? [{ worksite: OFFSITE_WORKSITE }] : []),
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
      commodity_group_id: true,
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
      start_date: true,
      end_date: true,
      posted_at: true,
      role: { select: { display: true, name: true } },
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
      ? // WP-E005: the account's Work Requests (every Work Order comes from one) — "First work request" only when there's none before.
        prisma.workRequest.groupBy({
          by: ["p_account_id"],
          where: { p_account_id: { in: accountIds }, status: { notIn: ["INCOMPLETE", "WITHDRAWN"] } },
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

  // PA-E004: the job's Category, for its art.
  const groupNames = new Map((await prisma.commodityGroup.findMany({ where: { id: { in: rows.map((w) => w.commodity_group_id).filter((x): x is string => !!x) } }, select: { id: true, name: true } })).map((g) => [g.id, g.name]));
  const cards = rows.map((w) => ({
    category: w.commodity_group_id ? groupNames.get(w.commodity_group_id) ?? null : null,
    id: w.id,
    title: w.title || "Untitled request",
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
    roleType: roleLong(w.role?.display ?? w.role?.name ?? null),
    companyName: identityFor(w).companyName,
    companyLogoUrl: identityFor(w).companyLogoUrl,
    identity: identityFor(w),
    skills: w.skills.map((s) => s.skill.name),
    postedAt: w.posted_at?.toISOString() ?? null,
    _overlap: w.skills.filter((s) => skillIds.includes(s.skill.id)).length,
    _raw: { worksite: w.worksite, start: w.start_date, end: w.end_date, fixed: w.budget_type === "FIXED" },
  }));

  if (input.tab === "best") {
    cards.sort((a, b) => b._overlap - a._overlap);
  }

  const mineMap = input.personId ? await myProposals(input.personId, cards.map((c) => c.id)) : null;
  const card$ = input.personId ? await prisma.providerProfile.findUnique({ where: { person_id: input.personId }, select: { onsite_rate_cents: true, remote_rate_cents: true, hourly_rate_cents: true } }) : null;
  const iso = (d: Date | null) => d?.toISOString().slice(0, 10) ?? null;
  return cards.map(({ _overlap, _raw, ...card }) => ({
    ...card, matched: _overlap, myProposal: mine ? mineMap?.get(card.id) ?? null : null,
    oneClick: card$ && !mineMap?.has(card.id) ? { rateCents: (_raw.worksite === "OFFSITE" ? card$.remote_rate_cents ?? card$.onsite_rate_cents : card$.onsite_rate_cents ?? card$.remote_rate_cents) ?? card$.hourly_rate_cents ?? null, per: _raw.fixed ? "" : "/hr", start: iso(_raw.start), end: iso(_raw.end) } : null,
  }));
}
