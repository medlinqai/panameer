import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";
import { experienceMonths } from "@/lib/experience";
import { getOnboardingState } from "@/lib/onboarding";
import { matchProvidersForSkills } from "@/lib/work-request-match";
import { displayFirstName } from "@/lib/display";
import type { BuyerFacts, MemberFacts, SellerFacts } from "@/lib/next-step";

const STEP_NAMES: Record<string, string> = {
  tell_us: "Résumé", title: "Title", roles: "Roles", skills: "Skills", rate: "Rates", picture: "Photo", finish: "Review",
};

/** Reads the member's own facts for nextStep(). Read-only; firstVisit is read before the page marks the visit. */
export async function loadMemberFacts(viewer: Viewer): Promise<MemberFacts> {
  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: {
      id: true,
      first_name: true,
      buyerProfile: { select: { id: true } },
      requesterProfile: { select: { completed_at: true, dashboard_seen_at: true } },
      providerProfile: {
        select: {
          id: true,
          work_method: true,
          onboarding_completed_at: true,
          dashboard_seen_at: true,
          roles: { select: { roleType: { select: { name: true } } } },
          employers: { select: { start_date: true, end_date: true, is_current: true } },
          projects: { select: { start_date: true, end_date: true, is_current: true } },
          _count: { select: { skills: true, serviceProducts: true } },
        },
      },
    },
  });
  const pp = person?.providerProfile ?? null;
  const isBuyer = !!person?.buyerProfile || !!person?.requesterProfile?.completed_at;

  const seller = pp ? await sellerFacts(viewer, pp) : null;
  const buyer = isBuyer && person ? await buyerFacts(person.id) : null;
  const seen = pp ? pp.dashboard_seen_at : person?.requesterProfile?.dashboard_seen_at ?? null;
  return { firstName: displayFirstName(person?.first_name ?? ""), firstVisit: !seen, seller, buyer };
}

type Span = { start_date: Date | null; end_date: Date | null; is_current: boolean };
type Pp = {
  id: string;
  work_method: string | null;
  onboarding_completed_at: Date | null;
  roles: { roleType: { name: string } }[];
  employers: Span[];
  projects: Span[];
  _count: { skills: number; serviceProducts: number };
};

async function sellerFacts(viewer: Viewer, pp: Pp): Promise<SellerFacts> {
  const published = !!pp.onboarding_completed_at;
  const spans = [...pp.employers, ...pp.projects].map((s) => ({ start: s.start_date, end: s.end_date, isCurrent: s.is_current }));
  const dated = spans.some((s) => s.start);
  const [credentials, colleagues, skillIds] = await Promise.all([
    prisma.certification.count({ where: { user_id: viewer.userId } }),
    prisma.connection.count({
      where: { kind: "COLLEAGUE", status: "ACCEPTED", OR: [{ from_user_id: viewer.userId }, { to_user_id: viewer.userId }] },
    }),
    prisma.providerSkill.findMany({ where: { provider_profile_id: pp.id }, select: { skill_id: true } }),
  ]);
  const matchingRequests = skillIds.length
    ? await prisma.workRequest.count({ where: { status: "POSTED", skills: { some: { skill_id: { in: skillIds.map((s) => s.skill_id) } } } } })
    : null;

  let resumeHref = "/join/provider";
  let resumeLabel: string | null = null;
  let stepsDone: number | null = null;
  let stepsTotal: number | null = null;
  if (!published) {
    const st = await getOnboardingState(viewer).catch(() => null);
    if (st) {
      const rail = ["tell_us", ...(st.steps as readonly string[]).filter((s) => s !== "finish")];
      const at = String(st.resumeStep);
      resumeLabel = STEP_NAMES[at] ?? null;
      if (STEP_NAMES[at]) resumeHref = `/join/provider?step=${at}`;
      const i = at === "finish" ? rail.length : rail.indexOf(at);
      if (i >= 0) {
        stepsDone = i;
        stepsTotal = rail.length;
      }
    }
  }
  return {
    published,
    recruiter: pp.work_method === "RECRUITER",
    resumeHref,
    resumeLabel,
    stepsDone,
    stepsTotal,
    months: dated ? experienceMonths(spans) : null,
    projects: pp.projects.length,
    credentials,
    skills: pp._count.skills,
    colleagues,
    sellsPackages: pp._count.serviceProducts > 0,
    matchingRequests,
    roleNames: pp.roles.map((r) => r.roleType.name),
  };
}

async function buyerFacts(personId: string): Promise<BuyerFacts> {
  const wr = await prisma.workRequest.findFirst({
    where: { buyer_person_id: personId, status: "POSTED" },
    orderBy: [{ posted_at: "desc" }, { created_at: "desc" }],
    select: { id: true, title: true, pillar_id: true, skills: { select: { skill_id: true } } },
  });
  if (!wr) return { openRequest: null };
  const [match, invited] = await Promise.all([
    wr.skills.length
      ? matchProvidersForSkills({ skillIds: wr.skills.map((s) => s.skill_id), pillarId: wr.pillar_id }).catch(() => null)
      : Promise.resolve(null),
    prisma.proposalRequest.count({ where: { work_request_id: wr.id } }),
  ]);
  return { openRequest: { id: wr.id, title: wr.title, matches: match ? match.providers.length : null, invited } };
}
