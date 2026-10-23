import { redirect } from "next/navigation";
import Link from "next/link";
import { guardPage } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { HireQuestionnaire } from "@/components/hire/HireQuestionnaire";
import { HOW_LONG, shipTos } from "@/lib/hire-questionnaire";
import { emptySd, postingHierarchy, readServiceDescription, topRoleCodeFor, workRoleNames } from "@/lib/service-description";
import { lastJobDefaults, loadOwned, resolveBuyer } from "@/lib/work-request";

export const dynamic = "force-dynamic";
export const metadata = { title: "Create a Job · Panameer" };

// SD-E003: Hire follows the Service Description standard; ?job=<draft>&step=<n> reopens a saved draft at a step (Edit).
export default async function Page({ searchParams }: { searchParams: Promise<{ job?: string; step?: string }> }) {
  const viewer = await guardPage("canHireTalent");
  const sp = await searchParams;
  let jobId: string | null = null;
  let sd = emptySd();
  if (sp.job) {
    const { pAccountId } = await resolveBuyer(viewer);
    const job = await loadOwned(viewer, sp.job, pAccountId).catch(() => null);
    // OJ-E002: matches live on the Job page now — a posted job's matches step (or any step ≥ 5) opens its Matches tab.
    if (job && (Number(sp.step) >= 5 || (Number(sp.step) === 4 && job.status !== "DRAFT"))) redirect(`/work-requests/${job.id}?tab=matches`);
    const read = job && (job.status === "DRAFT" || (job.status === "OPEN" && !(await prisma.sourcingEvent.count({ where: { job_id: job.id, status: { not: "DRAFT" } } })))) ? await readServiceDescription(job.id) : null;
    if (read) { jobId = sp.job; sd = read; }
  }
  const defaults = await lastJobDefaults(viewer, jobId);
  if (!jobId) {
    const ship = (await shipTos(viewer))[0];
    if (ship) sd = { ...sd, city: ship.city ?? "", state: ship.state ?? "" };
    sd = { ...sd, worksite: defaults.worksite, contractTypes: defaults.contractTypes, duration: defaults.duration, budgetType: defaults.budgetType };
  }
  // SM-E005: the Role dropdown lists the specific roles; each carries its top role for matching and saving.
  const top = new Map((await prisma.role.findMany({ select: { id: true, code: true } })).map((r) => [r.code, r.id]));
  const roles = (await workRoleNames()).map((name) => ({ name, roleId: top.get(topRoleCodeFor(name) ?? "") ?? null }));
  return (
    <div className="pm-white-page mx-auto w-full max-w-5xl">
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-extrabold">Create a Job</h1>
          <p className="text-[14px] text-ink-2">Tell us what you need, or let AI read your job description. We&apos;ll show you who fits, and you choose whose availability to request.</p>
        </div>
        <Link href="/hire/jobs" className="text-[13.5px] font-semibold text-magenta-dark underline underline-offset-4">My Jobs →</Link>
      </div>
      <HireQuestionnaire hierarchy={(await postingHierarchy()).groups.map((g) => ({ name: g.name, businessTypes: g.businessTypes.map((b) => ({ id: b.id, name: b.name, usesSkills: b.uses_skills })) }))} howLong={HOW_LONG} roles={roles} defaults={defaults} initial={sd} initialJobId={jobId} initialStep={jobId ? Math.min(5, Math.max(0, Number(sp.step ?? 0) || 0)) : 0} />
    </div>
  );
}
