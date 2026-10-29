import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionViewer } from "@/lib/session";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { claimFor, verifyClaim } from "@/lib/external-claim";
import { ClaimPublish, ClaimStart } from "@/components/claim/ClaimForms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Claim This Job · Panameer" };

// EX-E005: Claim This Job (public) — 1 Confirm You're the Company · 2 Check the Job · 3 Publish Free.
export default async function Page({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ v?: string }> }) {
  const { token } = await params;
  const { v } = await searchParams;
  const job = await prisma.externalJob.findUnique({ where: { claim_token: token }, include: { company: { select: { name: true, domain: true } }, _count: { select: { interests: true } } } });
  if (!job || job.status === "REMOVED" || job.status === "NOT_ORACLE") notFound();
  const verified = v ? await verifyClaim(v) : null;
  const viewer = await getSessionViewer();
  const user = viewer ? await prisma.user.findUnique({ where: { id: viewer.userId }, select: { email: true } }) : null;
  const claim = await claimFor(token, user?.email);
  const step = job.status === "CLAIMED" ? 3 : claim && (!claim.needs_admin || claim.admin_approved_at) ? 2 : 1;
  const back = encodeURIComponent(`/claim/${token}?from=email`);
  return (
    <>
      <MarketingHeader />
      <main className="mx-auto w-full max-w-2xl px-4 py-10" data-claim-page>
        <p className="text-[12px] font-bold tracking-[0.12em] text-magenta">CLAIM THIS JOB</p>
        <h1 className="mt-1 text-[28px] font-extrabold leading-tight">Claim &quot;{job.title}&quot;</h1>
        <p className="mt-1 text-[14px] text-ink-2">{job.company.name}{job.location ? ` · ${job.location}` : ""} · {job._count.interests} Oracle consultant{job._count.interests === 1 ? "" : "s"} interested</p>
        <ol className="mt-5 flex flex-wrap gap-2 text-[13px] font-semibold">
          {["Confirm You're " + job.company.name, "Check the Job", "Publish Free"].map((l, i) => <li key={l} className={i + 1 === step ? "rounded-full bg-ink px-3 py-1 text-surface" : i + 1 < step ? "rounded-full border border-ink px-3 py-1" : "rounded-full border border-line px-3 py-1 text-ink-3"}>{i + 1} {l}</li>)}
        </ol>
        <div className="mt-6">
          {step === 3 && <p className="text-[15px]">This job is posted on Panameer. {job.claimed_job_id && <Link href={`/work/jobs/${job.claimed_job_id}`} className="font-semibold underline">See the Job →</Link>}</p>}
          {step === 2 && <ClaimPublish token={token} initial={{ title: job.title, description: job.description ?? "", location: job.location ?? "", workType: job.work_type ?? "" }} />}
          {step === 1 && (verified ? (
            verified.needs_admin && !verified.admin_approved_at
              ? <p className="text-[15px]">Thanks — your email is confirmed. We&apos;re checking it belongs to {job.company.name}; you&apos;ll get an email when you can publish.</p>
              : <div className="space-y-3 text-[15px]"><p>Email confirmed: <b>{verified.email}</b>. Sign in or create your free buyer account with that email to check and publish the job.</p><p className="flex flex-wrap gap-3"><Link href={`/login?callbackUrl=${back}`} className="inline-flex min-h-10 items-center bg-magenta px-5 font-bold text-white">Sign In</Link><Link href={`/join/requester?email=${encodeURIComponent(verified.email)}&callbackUrl=${back}`} className="inline-flex min-h-10 items-center border border-ink px-5 font-bold">Create a Free Account</Link></p></div>
          ) : claim ? <p className="text-[15px]">We&apos;re checking that {user?.email} belongs to {job.company.name}. You&apos;ll get an email when you can publish.</p> : <ClaimStart token={token} domainHint={job.company.domain} />)}
        </div>
        <p className="mt-8 text-[13px] text-ink-2">We pre-fill the job from your posting so you just check it. Once published it becomes Posted on Panameer: the interested consultants are told first and answer with rate and availability. Free to post; you pay only when you hire.</p>
      </main>
      <MarketingFooter />
    </>
  );
}
