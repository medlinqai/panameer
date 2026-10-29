import Link from "next/link";
import { notFound } from "next/navigation";
import { guardPage } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { sourceLabel } from "@/lib/external-jobs";
import { ApplyExternal } from "@/components/work/ApplyExternal";
import { EXT_STAGE_LABEL, NOT_JOINED_LINE, type ExtStage } from "@/lib/external-apply";
import { BTN_OUT } from "@/components/hire/HireUI";

export const dynamic = "force-dynamic";
export const metadata = { title: "External Job · Work · Panameer" };

// EX-E002 / XA-E002: an External Job — consultants Apply on Panameer; only admins see the original link.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await guardPage("authenticated");
  const { id } = await params;
  const [job, me] = await Promise.all([
    prisma.externalJob.findUnique({ where: { id }, include: { company: { select: { name: true } }, _count: { select: { interests: true, views: true } } } }),
    prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { id: true, providerProfile: { select: { skills: { select: { skill_id: true } } } } } }),
  ]);
  if (!job || job.status === "REMOVED" || job.status === "NOT_ORACLE") notFound();
  if (job.status === "CLAIMED" && job.claimed_job_id) return <div className="mx-auto max-w-3xl py-8"><p className="text-[15px]">{job.company.name} posted this job on Panameer. <Link href={`/work/jobs/${job.claimed_job_id}`} className="font-semibold underline">Apply now →</Link></p></div>;
  await prisma.externalJobView.create({ data: { external_job_id: job.id, person_id: me?.id ?? null } }).catch(() => null);
  const mine = new Set(me?.providerProfile?.skills.map((s) => s.skill_id) ?? []);
  const skills = job.skill_ids.length ? await prisma.skill.findMany({ where: { id: { in: job.skill_ids } }, select: { id: true, name: true } }) : [];
  const app = me ? await prisma.externalJobInterest.findUnique({ where: { external_job_id_person_id: { external_job_id: job.id, person_id: me.id } }, select: { start_date: true, rate_cents: true, note: true, stage: true } }) : null;
  const expired = job.expires_at < new Date();
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6" data-external-job-detail>
      <p className="mb-3 text-[13px] font-semibold text-ink-2"><Link href="/work/jobs" className="hover:text-ink">← Jobs for You</Link></p>
      <p className="text-[12.5px] font-bold text-state-inactive">{sourceLabel(job.source)}</p>
      <h1 className="mt-1 text-[28px] font-extrabold leading-tight">{job.title}</h1>
      <p className="mt-1 text-[14px] text-ink-2">{[job.company.name, job.work_type && job.location ? `${job.work_type}, ${job.location}` : job.work_type ?? job.location, job.salary, `found ${job.received_at.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`].filter(Boolean).join(" · ")}</p>
      {job.tags.length > 0 && <p className="mt-2 flex flex-wrap gap-1.5">{job.tags.map((t) => <span key={t} className="rounded-full bg-bg-soft px-2 py-0.5 text-[11.5px] font-semibold">{t}</span>)}</p>}
      <h2 className="mt-6 text-[16px] font-extrabold">Summary</h2>
      <p className="mt-1 whitespace-pre-line text-[14px] leading-relaxed text-ink-2">{job.description ? job.description.slice(0, 4000) : "Description not yet added."}</p>
      <h2 className="mt-6 text-[16px] font-extrabold">Skills Matched to Your Profile</h2>
      <p className="mt-1 text-[14px]">{skills.length ? skills.map((s, i) => <span key={s.id}>{i > 0 && " · "}{mine.has(s.id) ? <b>{s.name} ✓</b> : <span className="text-ink-3">{s.name} (not on your profile)</span>}</span>) : <span className="text-ink-3">No skills read from this job yet.</span>}</p>
      <p className="mt-6 border-l-2 border-ink py-1 pl-3.5 text-[14px] text-ink-2" data-not-joined>{NOT_JOINED_LINE}</p>
      <div className="mt-4">
        {expired ? <p className="text-[14px] text-ink-2">This listing has closed.</p> : <ApplyExternal id={job.id} applied={!!app} start={app?.start_date?.toISOString().slice(0, 10) ?? null} rateCents={app?.rate_cents ?? null} note={app?.note ?? null} stage={app ? EXT_STAGE_LABEL[app.stage as ExtStage] ?? null : null} canWithdraw={app?.stage === "APPLIED"} />}
      </div>
      <p className="mt-3 text-[13px] text-ink-2" data-external-counts>{job._count.interests} applied · {job._count.views + 1} views</p>
      {/* XA-E006: admins keep the source and its link. */}
      {viewer.isSystemAdmin && <p className="mt-3"><a href={job.url} target="_blank" rel="noreferrer nofollow" className={BTN_OUT}>Open Original on {job.source} ↗</a></p>}
    </div>
  );
}
