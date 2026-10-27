import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ExtAction, KeyMaker, UploadSheet } from "@/components/admin/ExternalJobsTools";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bring Jobs In · External Jobs · Admin · Panameer" };

const RESULT: Record<string, string> = { LISTED: "Listed", DUPLICATE: "Duplicate · Merged", NOT_ORACLE: "Not Oracle · Skipped", NEEDS_REVIEW: "Needs Review", BLOCKED: "Blocked · On Request" };
const VIA: Record<string, string> = { EMAIL: "Email", CSV: "Agent CSV", CLIPPER: "Clipper", AGENT: "Agent" };
const card = "rounded-[12px] border border-state-border bg-white p-4";

// EX-E001: Admin › External Jobs › Bring Jobs In — four routes into one intake, today's counts and what happened to each job.
export default async function Page() {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const [items, review, keys] = await Promise.all([
    prisma.externalJobIntakeItem.findMany({ where: { created_at: { gte: start } }, orderBy: { created_at: "desc" }, take: 200 }),
    prisma.externalJob.findMany({ where: { status: "NEEDS_REVIEW" }, orderBy: { created_at: "desc" }, take: 50, select: { id: true, title: true, source: true, url: true, company: { select: { name: true } } } }),
    prisma.externalJobKey.findMany({ orderBy: { created_at: "desc" }, select: { id: true, label: true, key_hint: true, created_at: true, revoked_at: true } }),
  ]);
  const n = (r: string) => items.filter((i) => i.result === r).length;
  // EX-E001 (updated): no in.panameer.com — the root panameer.com MX is Scott's mailbox and never changes. Until a jobs
  // subdomain has its own MX, use Resend's ready-made receiving address; the webhook takes jobs@ at any domain.
  const inbound = process.env.EXTERNAL_JOBS_INBOUND_ADDRESS ?? null;
  return (
    <div className="mx-auto max-w-6xl" data-ext-intake>
      <p className="text-[13px] font-semibold text-ink-2"><Link href="/admin/external-jobs">← External Jobs</Link> › Bring Jobs In</p>
      <h1 className="mt-1 text-[26px] font-extrabold">Bring Jobs In</h1>
      <p className="text-[14px] text-ink-2">Every route lands in one intake that reads the job, removes duplicates, checks it&apos;s Oracle work and matches it to consultants.</p>
      <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <section className={card}><h2 className="text-[15px] font-extrabold">1. Forward Emails</h2><p className="mt-1 text-[12.5px] text-ink-2">Forward LinkedIn or Indeed job-alert emails (or your agent&apos;s daily report) from your admin address.</p>{inbound ? <p className="mt-2 font-mono text-[13px] font-bold" data-ext-inbound>{inbound}</p> : <p className="mt-2 text-[12.5px] font-semibold text-state-pending" data-ext-inbound-missing>Not set up yet: in Resend › Receiving, use the ready-made address jobs@…resend.app (webhook → /api/webhooks/resend-inbound), then set EXTERNAL_JOBS_INBOUND_ADDRESS in Vercel.</p>}</section>
        <section className={card}><h2 className="text-[15px] font-extrabold">2. Agent or Spreadsheet Upload</h2><p className="mt-1 text-[12.5px] text-ink-2">CSV or XLSX with title, company, location, link, description, salary — columns matched for you.</p><div className="mt-2"><UploadSheet /></div></section>
        <section className={card}><h2 className="text-[15px] font-extrabold">3. Job Clipper</h2><p className="mt-1 text-[12.5px] text-ink-2">Send to Panameer from the Chrome Job Clipper — paste a key below into its settings.</p></section>
        <section className={card}><h2 className="text-[15px] font-extrabold">4. Connection for an Agent</h2><p className="mt-1 font-mono text-[12px]">POST /api/external-jobs</p><p className="text-[12.5px] text-ink-2">Header X-Api-Key with a key from Keys.</p></section>
      </div>
      <h2 className="mt-8 text-[18px] font-extrabold">Today&apos;s Intake</h2>
      <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-5" data-ext-today>
        {([["Received", items.length], ["Listed", n("LISTED")], ["Duplicates Merged", n("DUPLICATE")], ["Not Oracle", n("NOT_ORACLE")], ["Needs Review", review.length]] as const).map(([l, v]) => <div key={l} className={card}><b className="block text-[24px] font-extrabold">{v}</b><span className="text-[12px] text-ink-2">{l}</span></div>)}
      </div>
      {review.length > 0 && <section className="mt-6"><h3 className="text-[15px] font-extrabold">Needs Review</h3>
        <ul className="mt-2 divide-y divide-line border-y border-line">{review.map((r) => <li key={r.id} className="flex flex-wrap items-center gap-3 py-2 text-[13.5px]"><span className="min-w-0 flex-1"><b>{r.title}</b> <span className="text-ink-2">· {r.company.name} · {r.source}</span> <a href={r.url} target="_blank" rel="noreferrer" className="text-[12px] underline">Open ↗</a></span><ExtAction action="list" id={r.id} label="List" /><ExtAction action="skip" id={r.id} label="Skip" /></li>)}</ul></section>}
      <table className="mt-6 w-full text-left text-[13px]" data-ext-intake-table>
        <thead><tr className="border-b border-ink text-[11px] uppercase tracking-[0.08em] text-ink-3"><th className="py-2">Job</th><th>Company</th><th>Came In Via</th><th>Source</th><th>Result</th></tr></thead>
        <tbody>{items.map((i) => <tr key={i.id} className="border-b border-line"><td className="py-2 font-semibold">{i.title}</td><td>{i.company_name ?? "—"}</td><td>{VIA[i.came_in_via] ?? i.came_in_via}</td><td>{i.source ?? "—"}</td><td>{RESULT[i.result] ?? i.result}</td></tr>)}
          {!items.length && <tr><td colSpan={5} className="py-4 text-ink-3">Nothing came in today yet.</td></tr>}</tbody>
      </table>
      <h2 className="mt-8 text-[18px] font-extrabold">Keys</h2>
      <p className="text-[13px] text-ink-2">For an agent or the Job Clipper. A key is shown once.</p>
      <ul className="mt-2 divide-y divide-line border-y border-line">{keys.map((k) => <li key={k.id} className="flex flex-wrap items-center gap-3 py-2 text-[13.5px]"><span className="flex-1"><b>{k.label}</b> <span className="font-mono text-ink-2">PNM-EXT-…{k.key_hint}</span> <span className="text-ink-3">· {k.created_at.toISOString().slice(0, 10)}</span>{k.revoked_at && <span className="text-state-declined"> · Revoked</span>}</span>{!k.revoked_at && <ExtAction action="revoke-key" id={k.id} label="Revoke" />}</li>)}</ul>
      <div className="mt-3"><KeyMaker /></div>
    </div>
  );
}
