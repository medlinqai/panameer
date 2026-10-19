import Link from "next/link";
import { guardPage } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { HireQuestionnaire } from "@/components/hire/HireQuestionnaire";
import { HOW_LONG, shipTos } from "@/lib/hire-questionnaire";
import { emptySd, postingHierarchy, readServiceDescription } from "@/lib/service-description";
import { loadOwned, resolveBuyer } from "@/lib/work-request";

export const dynamic = "force-dynamic";
export const metadata = { title: "Hire · Panameer" };

// SD-E003: Hire follows the Service Description standard; ?job=<draft>&step=<n> reopens a saved draft at a step (Edit).
export default async function Page({ searchParams }: { searchParams: Promise<{ job?: string; step?: string }> }) {
  const viewer = await guardPage("canHireTalent");
  const sp = await searchParams;
  let jobId: string | null = null;
  let sd = emptySd();
  if (sp.job) {
    const { pAccountId } = await resolveBuyer(viewer);
    const job = await loadOwned(viewer, sp.job, pAccountId).catch(() => null);
    const read = job && job.status === "DRAFT" ? await readServiceDescription(job.id) : null;
    if (read) { jobId = sp.job; sd = read; }
  }
  if (!jobId) {
    const ship = (await shipTos(viewer))[0];
    if (ship) sd = { ...sd, city: ship.city ?? "", state: ship.state ?? "" };
  }
  const roles = (await prisma.role.findMany({ orderBy: { sort_order: "asc" }, select: { id: true, name: true, display: true } })).map((r) => ({ id: r.id, label: r.display || r.name }));
  return (
    <div className="pm-white-page mx-auto w-full max-w-5xl">
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-extrabold">Hire</h1>
          <p className="text-[14px] text-ink-2">Tell us what you need — or upload a posting. We&apos;ll show you who fits, and you choose who sends a proposal.</p>
        </div>
        <Link href="/hire/jobs" className="text-[13.5px] font-semibold text-magenta-dark underline underline-offset-4">My Jobs →</Link>
      </div>
      <HireQuestionnaire hierarchy={(await postingHierarchy()).groups.map((g) => ({ name: g.name, businessTypes: g.businessTypes.map((b) => ({ id: b.id, name: b.name, usesSkills: b.uses_skills })) }))} howLong={HOW_LONG} roles={roles} initial={sd} initialJobId={jobId} initialStep={jobId ? Math.min(5, Math.max(0, Number(sp.step ?? 0) || 0)) : 0} />
    </div>
  );
}
