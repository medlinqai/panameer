import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { recruiterView } from "@/lib/external-contacts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your Applicants · Panameer", robots: { index: false } };

// XA-E004: the recruiter's link — the job, then its applicants by P-number, then Respond to These Applicants.
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const v = await recruiterView(token, (await headers()).get("user-agent"));
  if (!v) notFound();
  const usd = (c: number) => `$${Math.round(c / 100).toLocaleString("en-US")}/hr`;
  return (
    <>
      <MarketingHeader />
      <main className="mx-auto w-full max-w-3xl px-4 py-10 font-body text-ink" data-recruiter-page>
        <p className="text-[12px] font-bold tracking-[0.12em] text-magenta">APPLICANTS ON PANAMEER</p>
        <h1 className="mt-1 text-[28px] font-extrabold leading-tight">{v.job.title}</h1>
        <p className="mt-1 text-[14px] text-ink-2">{[v.job.company, v.job.workType && v.job.location ? `${v.job.workType}, ${v.job.location}` : v.job.workType ?? v.job.location].filter(Boolean).join(" · ")}</p>
        <p className="mt-4 text-[15px]">{v.applicants.length} Oracle consultant{v.applicants.length === 1 ? " has" : "s have"} applied to this role through Panameer. Names are shared once you respond.</p>
        <ul className="mt-4 divide-y divide-line border-y border-line" data-recruiter-applicants>
          {v.applicants.map((a) => (
            <li key={a.label} className="py-3.5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <b className="text-[15px]">{a.label}</b>
                <span className="text-[14px] font-bold">{a.rateCents ? usd(a.rateCents) : "Rate on request"}</span>
              </div>
              <p className="mt-0.5 text-[13.5px] text-ink-2">{[a.of ? `${a.matched.length} of ${a.of} skills${a.matched.length ? ` (${a.matched.slice(0, 4).join(", ")})` : ""}` : null, a.start ? `available ${a.start.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}` : null, a.reviews ?? "No Reviews Yet"].filter(Boolean).join(" · ")}</p>
              {a.certifications.length > 0 && <p className="mt-0.5 text-[13px] text-ink-2">Certified: {a.certifications.join(" · ")}</p>}
            </li>
          ))}
          {!v.applicants.length && <li className="py-4 text-[14px] text-ink-2">No applicants yet.</li>}
        </ul>
        {v.job.status === "CLAIMED"
          ? <p className="mt-6 text-[14.5px]">This job is on Panameer now. <Link href={v.job.claimedJobId ? `/work-requests/${v.job.claimedJobId}?tab=responses` : "/login"} className="font-semibold underline">See the responses →</Link></p>
          : <Link href={`/claim/${v.job.claimToken}`} className="mt-6 inline-flex min-h-11 items-center bg-magenta px-6 text-[15px] font-bold text-white hover:bg-magenta-dark" data-respond>Respond to These Applicants</Link>}
        <p className="mt-3 text-[12.5px] text-ink-3">Free to post. You confirm your work email, check the job, and publish — the applicants come with it.</p>
      </main>
      <MarketingFooter />
    </>
  );
}
