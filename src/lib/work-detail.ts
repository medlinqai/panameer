import { roleLong } from "@/lib/role-labels";
import { prisma } from "@/lib/prisma";
import { buildBuyerIdentity, scrubTrack, type BuyerIdentity } from "@/lib/work-request-identity";
import { buyerTrackRecord } from "@/lib/buyer-track-record";
import { pretty, workBudgetLabel } from "@/lib/work-feed";
import {
  SOURCING_STAGE_LABEL,
  sourcingStageForProvider,
  type SourcingStage,
} from "@/lib/sourcing-stage";
import { relativeDay } from "@/lib/relative-day";

export type WorkDetail = {
  id: string;
  title: string;
  description: string | null;
  budgetLabel: string | null;
  experienceLevel: string | null;
  duration: string | null;
  worksite: string | null;
  location: string | null;
  roleType: string | null;
  skills: string[];
  postedAgo: string | null;
  identity: BuyerIdentity;
  stage: SourcingStage | null;
  stageLabel: string | null;
};

export const PROVIDER_OPENABLE_STATUS = "POSTED" as const;

export async function getWorkDetailForProvider(input: {
  id: string;
  providerPersonId: string | null;
}): Promise<WorkDetail | null> {
  const w = await prisma.workRequest.findFirst({
    where: { id: input.id, status: PROVIDER_OPENABLE_STATUS },
    select: {
      id: true,
      title: true,
      description: true,
      budget_type: true,
      budget_amount_cents: true,
      budget_min_cents: true,
      budget_max_cents: true,
      currency: true,
      experience_level: true,
      duration: true,
      location_country: true,
      worksite: true,
      posted_at: true,
      roleType: { select: { display: true, name: true } },
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
              entity_validated_at: true,
            },
          },
          user: { select: { email_verified: true } },
        },
      },
      skills: { select: { skill: { select: { name: true } } } },
    },
  });
  if (!w) return null;

  const [postedCount, account] = await Promise.all([
    prisma.workRequest.count({
      where: { p_account_id: w.p_account_id, status: PROVIDER_OPENABLE_STATUS },
    }),
    prisma.pAccount.findUnique({
      where: { id: w.p_account_id },
      select: { created_at: true },
    }),
  ]);

  const identity = buildBuyerIdentity({
    person: w.buyer,
    companyVisibility: w.company_visibility,
    companyCodeName: w.company_code_name,
    standing: {
      memberSince: account?.created_at?.toISOString() ?? null,
      postedCount,
    },
    viewer: { isOwner: false, isAdmin: false, isPlus: false },
  });
  identity.track = w.buyer.company ? scrubTrack(await buyerTrackRecord(w.buyer.company.id), identity.companyConfidential) : null;

  const stage = input.providerPersonId
    ? await sourcingStageForProvider(w.id, input.providerPersonId)
    : null;

  return {
    id: w.id,
    title: w.title || "Untitled work request",
    description: w.description,
    budgetLabel: workBudgetLabel({
      amountCents: w.budget_amount_cents,
      minCents: w.budget_min_cents,
      maxCents: w.budget_max_cents,
      currency: w.currency,
      budgetType: w.budget_type,
    }),
    experienceLevel: pretty(w.experience_level),
    duration: pretty(w.duration),
    worksite: pretty(w.worksite),
    location: w.location_country,
    roleType: roleLong(w.roleType?.display ?? w.roleType?.name ?? null),
    skills: w.skills.map((s) => s.skill.name),
    postedAgo: w.posted_at ? relativeDay(w.posted_at.toISOString()) : null,
    identity,
    stage,
    stageLabel: stage ? SOURCING_STAGE_LABEL[stage] : null,
  };
}
