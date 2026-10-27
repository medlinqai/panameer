import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { sourceLabel } from "@/lib/external-jobs";
import { newToday } from "@/lib/job-agent";

export const dynamic = "force-dynamic";
export const metadata = { title: "Oracle Jobs · Panameer", description: "Every Oracle job in one place — posted on Panameer and from across the web. Stop going to all these sites. Let the jobs find you." };

const usd = (c: number | null) => (c == null ? null : `$${Math.round(c / 100)}`);

// EX-E007: the public Jobs page — Posted on Panameer and External jobs, filters, the Job Agent headline. Sign up to act.
export default async function Page({ searchParams }: { searchParams: Promise<{ skill?: string; location?: string; rate?: string }> }) {
  const sp = await searchParams;
  const skill = (sp.skill ?? "").trim(), loc = (sp.location ?? "").trim(), rate = Number((sp.rate ?? "").replace(/[^0-9.]/g, "")) || 0;
  const like = (v: string) => ({ contains: v, mode: "insensitive" as const });
  const [posted, external, today] = await Promise.all([
    prisma.job.findMany({ where: { kind: "JOB", status: "OPEN", buyer: { user: { is: { is_test: false } } }, ...(skill ? { OR: [{ title: like(skill) }, { description: like(skill) }, { skills: { some: { skill: { name: like(skill) } } } }] } : {}), ...(loc ? { OR: [{ city: like(loc) }, { state: like(loc) }, { location_country: like(loc) }] } : {}), ...(rate ? { budget_max_cents: { gte: Math.round(rate * 100) } } : {}) }, orderBy: { posted_at: "desc" }, take: 60, select: { id: true, title: true, description: true, posted_at: true, worksite: true, city: true, state: true, location_country: true, budget_min_cents: true, budget_max_cents: true, budget_type: true, buyer: { select: { company: { select: { name: true } } } } } }),
    rate ? Promise.resolve([]) : prisma.externalJob.findMany({ where: { status: "LISTED", expires_at: { gt: new Date() }, ...(skill ? { OR: [{ title: like(skill) }, { description: like(skill) }] } : {}), ...(loc ? { location: like(loc) } : {}) }, orderBy: { received_at: "desc" }, take: 120, select: { id: true, title: true, source: true, url: true, location: true, work_type: true, salary: true, received_at: true, company: { select: { name: true } } } }),
    newToday(),
  ]);
  const where = (j: (typeof posted)[number]) => [j.worksite === "OFFSITE" ? "Remote" : j.worksite === "HYBRID" ? "Hybrid" : j.worksite === "ONSITE" ? "Onsite" : null, [j.city, j.state].filter(Boolean).join(", ") || j.location_country].filter(Boolean).join(", ");
  // Only Posted on Panameer jobs carry Google JobPosting markup; external jobs link to their source.
  const ld = posted.map((j) => ({ "@context": "https://schema.org", "@type": "JobPosting", title: j.title, description: j.description ?? j.title, datePosted: j.posted_at?.toISOString(), hiringOrganization: { "@type": "Organization", name: j.buyer?.company?.name ?? "Panameer Buyer" }, ...(j.worksite === "OFFSITE" ? { jobLocationType: "TELECOMMUTE", applicantLocationRequirements: { "@type": "Country", name: j.location_country ?? "United States" } } : { jobLocation: { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: j.city ?? undefined, addressRegion: j.state ?? undefined, addressCountry: j.location_country ?? "US" } } }), ...(j.budget_max_cents ? { baseSalary: { "@type": "MonetaryAmount", currency: "USD", value: { "@type": "QuantitativeValue", minValue: (j.budget_min_cents ?? j.budget_max_cents) / 100, maxValue: j.budget_max_cents / 100, unitText: j.budget_type === "FIXED" ? "YEAR" : "HOUR" } } } : {}) }));
  return (
    <>
      <MarketingHeader />
      {ld.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />}
      <main className="mx-auto w-full max-w-5xl px-4 py-10" data-public-jobs>
        <h1 className="text-[32px] font-extrabold leading-tight">Every Oracle Job in One Place</h1>
        <p className="mt-1 text-[15px] text-ink-2">Stop going to all these sites. Let the jobs find you. <b className="text-ink">Panameer Job Agent</b>{today.n ? ` found ${today.n} new Oracle job${today.n === 1 ? "" : "s"} today from ${today.sites} site${today.sites === 1 ? "" : "s"}.` : "."}</p>
        <form className="mt-5 flex flex-wrap gap-2" method="get" data-jobs-filters>
          <input name="skill" defaultValue={skill} placeholder="Skill (e.g. Fusion P2P)" className="min-w-[180px] flex-1 rounded-[8px] border border-state-border px-3 py-2 text-[14px]" />
          <input name="location" defaultValue={loc} placeholder="Location" className="w-44 rounded-[8px] border border-state-border px-3 py-2 text-[14px]" />
          <input name="rate" defaultValue={sp.rate ?? ""} placeholder="Min $/hr" inputMode="numeric" className="w-28 rounded-[8px] border border-state-border px-3 py-2 text-[14px]" />
          <button type="submit" className="inline-flex min-h-10 items-center bg-ink px-4 text-[14px] font-semibold text-surface">Filter</button>
        </form>
        <p className="mt-2 text-[12.5px] text-ink-3">{posted.length} posted on Panameer · {external.length} external{rate ? " (rate filters Panameer jobs only)" : ""}</p>
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {posted.map((j) => (
            <li key={j.id} className="flex flex-wrap items-center gap-3 py-3" data-public-posted>
              <span className="min-w-0 flex-1"><b className="block text-[15px]">{j.title}</b><span className="text-[12.5px] text-ink-2"><b className="font-semibold text-ink">Posted on Panameer</b> · {[j.buyer?.company?.name, where(j), j.budget_max_cents ? `${usd(j.budget_min_cents) ?? ""}–${usd(j.budget_max_cents)}${j.budget_type === "FIXED" ? "" : "/hr"}` : null].filter(Boolean).join(" · ")}</span></span>
              <Link href="/join" className="inline-flex min-h-9 items-center bg-ink px-4 text-[13px] font-bold text-surface">Sign Up to Apply</Link>
            </li>
          ))}
          {external.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center gap-3 py-3" data-public-external>
              <span className="min-w-0 flex-1"><b className="block text-[15px]">{e.title}</b><span className="text-[12.5px] text-ink-2"><b className="font-semibold text-state-inactive">{sourceLabel(e.source)}</b> · {[e.company.name, e.work_type ?? e.location, e.salary].filter(Boolean).join(" · ")}</span></span>
              <Link href="/join" className="inline-flex min-h-9 items-center border border-ink px-4 text-[13px] font-bold">Sign Up · I&apos;m Interested</Link>
              <a href={e.url} target="_blank" rel="noreferrer nofollow" className="inline-flex min-h-9 items-center border border-line px-4 text-[13px] font-semibold">Open Original ↗</a>
            </li>
          ))}
          {!posted.length && !external.length && <li className="py-6 text-[14px] text-ink-3">No jobs match those filters.</li>}
        </ul>
      </main>
      <MarketingFooter />
    </>
  );
}
