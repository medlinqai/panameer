import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSetting } from "@/lib/platform-settings";
import { CopyMessage, ExtAction } from "@/components/admin/ExternalJobsTools";

export const dynamic = "force-dynamic";
export const metadata = { title: "External Jobs · Admin · Panameer" };

const card = "rounded-[12px] border border-state-border bg-white p-4";
const app = (process.env.NEXT_PUBLIC_APP_URL ?? "https://app.panameer.com").replace(/\/$/, "");

// EX-E006/E008: Admin › External Jobs — outreach (manual for now), claims to approve, totals and every listing.
export default async function Page() {
  const now = new Date();
  const [ready, claims, autoEmail] = await Promise.all([
    prisma.externalJob.findMany({ where: { status: "LISTED", expires_at: { gt: now }, interests: { some: {} } }, orderBy: { received_at: "desc" }, take: 200, select: { id: true, title: true, claim_token: true, hiring_name: true, hiring_url: true, contacted_at: true, source: true, company: { select: { name: true } }, _count: { select: { interests: true, views: true } } } }),
    prisma.externalJobClaim.findMany({ where: { needs_admin: true, admin_approved_at: null, verified_at: { not: null } }, orderBy: { created_at: "desc" }, take: 50 }),
    getSetting("external_jobs_company_emails"),
  ]);
  const toContact = ready.filter((r) => r._count.interests >= 3);
  const claimJobs = new Map((await prisma.externalJob.findMany({ where: { id: { in: claims.map((c) => c.external_job_id) } }, select: { id: true, title: true, company: { select: { name: true } } } })).map((j) => [j.id, j]));
  return (
    <div className="mx-auto max-w-6xl" data-ext-admin>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-[26px] font-extrabold">External Jobs</h1><p className="text-[14px] text-ink-2">Real Oracle jobs from wherever they&apos;re posted — labelled, linked to the original, and claimable for free.</p></div>
        <Link href="/admin/external-jobs/intake" className="inline-flex min-h-10 items-center bg-ink px-4 text-[14px] font-semibold text-surface">Bring Jobs In</Link>
      </div>

      {/* EX-E006: Ready to Contact — 3+ Interested. Outreach is manual; Panameer emails no company yet. */}
      <section className="mt-8" data-ext-ready>
        <h2 className="text-[18px] font-extrabold">Ready to Contact <span className="text-[13px] font-semibold text-ink-3">{toContact.length}</span></h2>
        <p className="text-[13px] text-ink-2">Jobs with 3 or more interested consultants. Copy the note, send it yourself, then Mark Contacted. Automated company emails: <b>{autoEmail ? "On" : "Off"}</b> (<Link href="/admin/settings" className="underline">Settings</Link>).</p>
        <ul className="mt-2 divide-y divide-line border-y border-line">
          {toContact.map((r) => {
            const link = `${app}/claim/${r.claim_token}`;
            const msg = `Your public Oracle job '${r.title}' has ${r._count.interests} interested Oracle consultants on Panameer. Post it free and get their responses directly: ${link}`;
            return (
              <li key={r.id} className="flex flex-wrap items-center gap-3 py-3 text-[13.5px]" data-ext-ready-row>
                <span className="min-w-0 flex-1">
                  <b className="block">{r.company.name} · {r.title}</b>
                  <span className="text-ink-2">{r.hiring_name ? <>{r.hiring_url ? <a href={r.hiring_url} target="_blank" rel="noreferrer" className="underline">{r.hiring_name} ↗</a> : r.hiring_name} · </> : null}{r._count.interests} interested · {r._count.views} views · via {r.source} · <span className="font-mono text-[12px]">{link}</span></span>
                </span>
                {r.contacted_at ? <span className="text-[12.5px] text-state-accepted">Contacted {r.contacted_at.toISOString().slice(0, 10)}</span> : null}
                <CopyMessage text={msg} />
                <ExtAction action="contacted" id={r.id} label={r.contacted_at ? "Contacted Again" : "Mark Contacted"} />
              </li>
            );
          })}
          {!toContact.length && <li className="py-4 text-[13.5px] text-ink-3">No job has 3 interested consultants yet.</li>}
        </ul>
      </section>

      {claims.length > 0 && <section className="mt-8" data-ext-claims>
        <h2 className="text-[18px] font-extrabold">Claims to Approve</h2>
        <p className="text-[13px] text-ink-2">The email&apos;s domain didn&apos;t match the company — check it belongs to them.</p>
        <ul className="mt-2 divide-y divide-line border-y border-line">{claims.map((c) => { const j = claimJobs.get(c.external_job_id); return <li key={c.id} className="flex flex-wrap items-center gap-3 py-2 text-[13.5px]"><span className="flex-1"><b>{c.email}</b> · {c.name}{c.role ? ` (${c.role})` : ""} · {j?.company.name} · {j?.title}</span><ExtAction action="approve-claim" id={c.id} label="Approve" /></li>; })}</ul>
      </section>}
    </div>
  );
}
