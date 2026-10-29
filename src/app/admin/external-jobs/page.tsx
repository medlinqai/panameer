import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSetting } from "@/lib/platform-settings";
import { AddContact, CopyMessage, ExtAction, MarkContacted } from "@/components/admin/ExternalJobsTools";
import { outreachMessage } from "@/lib/external-contacts";

export const dynamic = "force-dynamic";
export const metadata = { title: "External Jobs · Admin · Panameer" };

const card = "rounded-[12px] border border-state-border bg-white p-4";
const app = (process.env.NEXT_PUBLIC_APP_URL ?? "https://app.panameer.com").replace(/\/$/, "");

// EX-E006/E008: Admin › External Jobs — outreach (manual for now), claims to approve, totals and every listing.
export default async function Page() {
  const now = new Date();
  const week = new Date(now.getTime() - 7 * 86_400_000);
  const [ready, claims, autoEmail, listed, views7, interested, contacted, claimed, removed, all] = await Promise.all([
    prisma.externalJob.findMany({ where: { status: "LISTED", expires_at: { gt: now }, interests: { some: {} } }, orderBy: { received_at: "desc" }, take: 200, select: { id: true, title: true, claim_token: true, contacted_at: true, contacted_channel: true, source: true, company: { select: { name: true } }, interests: { select: { rate_cents: true } }, contacts: { orderBy: { created_at: "asc" }, select: { id: true, name: true, linkedin_url: true, email: true, source: true, token: true, opened_at: true } }, _count: { select: { interests: true, views: true } } } }),
    prisma.externalJobClaim.findMany({ where: { needs_admin: true, admin_approved_at: null, verified_at: { not: null } }, orderBy: { created_at: "desc" }, take: 50 }),
    getSetting("external_jobs_company_emails"),
    prisma.externalJob.count({ where: { status: "LISTED", expires_at: { gt: now } } }),
    prisma.externalJobView.count({ where: { created_at: { gte: week } } }),
    prisma.externalJobInterest.count(),
    prisma.externalJob.count({ where: { contacted_at: { not: null } } }),
    prisma.externalJob.count({ where: { status: "CLAIMED" } }),
    prisma.externalJob.count({ where: { status: "REMOVED" } }),
    prisma.externalJob.findMany({ where: { status: { in: ["LISTED", "CLAIMED", "REMOVED"] } }, orderBy: { received_at: "desc" }, take: 300, select: { id: true, title: true, source: true, url: true, status: true, remove_reason: true, expires_at: true, contacted_at: true, company: { select: { name: true, blocked_at: true } }, _count: { select: { interests: true, views: true } } } }),
  ]);
  const toContact = ready.filter((r) => r._count.interests >= 3);
  const claimJobs = new Map((await prisma.externalJob.findMany({ where: { id: { in: claims.map((c) => c.external_job_id) } }, select: { id: true, title: true, company: { select: { name: true } } } })).map((j) => [j.id, j]));
  return (
    <div className="mx-auto max-w-6xl" data-ext-admin>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-[26px] font-extrabold">External Jobs</h1><p className="text-[14px] text-ink-2">Real Oracle jobs from wherever they&apos;re posted — labelled, linked to the original, and claimable for free.</p></div>
        <Link href="/admin/external-jobs/intake" className="inline-flex min-h-10 items-center bg-ink px-4 text-[14px] font-semibold text-surface">Bring Jobs In</Link>
      </div>

      {/* EX-E008: totals. */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-6" data-ext-totals>
        {([["Listed", listed], ["Views (7 Days)", views7], ["Interested", interested], ["Contacted", contacted], ["Claimed", claimed], ["Removed", removed]] as const).map(([l, v]) => <div key={l} className={card}><b className="block text-[24px] font-extrabold">{v.toLocaleString("en-US")}</b><span className="text-[12px] text-ink-2">{l}</span></div>)}
      </div>

      {/* EX-E006: Ready to Contact — 3+ Interested. Outreach is manual; Panameer emails no company yet. */}
      <section className="mt-8" data-ext-ready>
        <h2 className="text-[18px] font-extrabold">Ready to Contact <span className="text-[13px] font-semibold text-ink-3">{toContact.length}</span></h2>
        <p className="text-[13px] text-ink-2">Jobs with 3 or more applicants. Copy a contact&apos;s message, send it yourself, then Mark Contacted. Each contact&apos;s link shows when they open it. Automated company emails: <b>{autoEmail ? "On" : "Off"}</b> (<Link href="/admin/settings" className="underline">Settings</Link>).</p>
        <ul className="mt-2 divide-y divide-line border-y border-line">
          {toContact.map((r) => {
            const rates = r.interests.map((x) => x.rate_cents).filter((c): c is number => !!c);
            const usd = (c: number) => `$${Math.round(c / 100).toLocaleString("en-US")}`;
            return (
              <li key={r.id} className="py-3 text-[13.5px]" data-ext-ready-row>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="min-w-0 flex-1">
                    <b className="block">{r.company.name} · {r.title}</b>
                    <span className="text-ink-2">{r._count.interests} applicants · {rates.length ? `${usd(Math.min(...rates))}–${usd(Math.max(...rates))}/hr` : "no rates yet"} · {r.contacts.length} contact{r.contacts.length === 1 ? "" : "s"} · via {r.source}</span>
                  </span>
                  {r.contacted_at ? <span className="text-[12.5px] text-state-accepted">Contacted {r.contacted_at.toISOString().slice(0, 10)}{r.contacted_channel ? ` · ${r.contacted_channel === "EMAIL" ? "Email" : "LinkedIn"}` : ""}</span> : null}
                  <MarkContacted id={r.id} again={!!r.contacted_at} />
                </div>
                <ul className="mt-2 space-y-1.5 pl-3" data-ext-contacts>
                  {r.contacts.map((c) => {
                    const link = `${app}/r/${c.token}`;
                    return (
                      <li key={c.id} className="flex flex-wrap items-center gap-2 text-[13px]">
                        <span className="min-w-0 flex-1">{c.linkedin_url ? <a href={c.linkedin_url} target="_blank" rel="noreferrer" className="font-semibold underline">{c.name ?? "LinkedIn Profile"} ↗</a> : <b>{c.name ?? c.email}</b>}{c.email && c.linkedin_url ? ` · ${c.email}` : ""} <span className="text-ink-3">· {c.source === "CLIPPER" ? "Clipper" : "Manual"}{c.opened_at ? ` · Opened ${c.opened_at.toISOString().slice(0, 10)}` : ""} · <span className="font-mono text-[12px]">{link}</span></span></span>
                        <CopyMessage text={outreachMessage(r._count.interests, r.title, rates, link)} />
                      </li>
                    );
                  })}
                  <li><AddContact id={r.id} /></li>
                </ul>
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

      {/* EX-E008: every listing — Remove (with a reason), or Remove on Request (blocks the company from future listings). */}
      <section className="mt-8">
        <h2 className="text-[18px] font-extrabold">Listings</h2>
        <table className="mt-2 w-full text-left text-[13px]" data-ext-table>
          <thead><tr className="border-b border-ink text-[11px] uppercase tracking-[0.08em] text-ink-3"><th className="py-2">Job</th><th>Company</th><th>Source</th><th className="text-right">Views</th><th className="text-right">Interested</th><th>Contacted</th><th>Status</th><th /></tr></thead>
          <tbody>{all.map((j) => {
            const expired = j.status === "LISTED" && j.expires_at < now;
            return (
              <tr key={j.id} className="border-b border-line">
                <td className="py-2"><a href={j.url} target="_blank" rel="noreferrer" className="font-semibold hover:underline">{j.title}</a></td>
                <td>{j.company.name}</td><td>{j.source}</td>
                <td className="text-right tabular-nums">{j._count.views}</td><td className="text-right tabular-nums">{j._count.interests}</td>
                <td>{j.contacted_at ? j.contacted_at.toISOString().slice(0, 10) : "—"}</td>
                <td>{j.status === "REMOVED" ? (j.company.blocked_at ? "Removed on Request" : `Removed${j.remove_reason ? ` · ${j.remove_reason}` : ""}`) : j.status === "CLAIMED" ? "Claimed" : expired ? "Expired" : "Listed"}</td>
                <td className="whitespace-nowrap text-right">{j.status === "LISTED" && !expired && <span className="inline-flex gap-1.5"><ExtAction action="remove" id={j.id} label="Remove" ask="Why remove it?" /><ExtAction action="remove-on-request" id={j.id} label="Remove on Request" ask="Who asked (for the record)?" /></span>}</td>
              </tr>
            );
          })}
          {!all.length && <tr><td colSpan={8} className="py-4 text-ink-3">No external jobs yet — <Link href="/admin/external-jobs/intake" className="underline">bring some in</Link>.</td></tr>}</tbody>
        </table>
      </section>
    </div>
  );
}
