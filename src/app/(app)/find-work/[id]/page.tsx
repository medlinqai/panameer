import { notFound } from "next/navigation";
import { guardPage } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { BackLink } from "@/components/console/BackLink";
import { WhoIsAsking } from "@/components/work/WhoIsAsking";
import { getWorkDetailForProvider } from "@/lib/work-detail";
import { proposeEligibility } from "@/lib/proposals";
import { providerEventView, rateCardFor } from "@/lib/sourcing-events";
import { listInterviews } from "@/lib/interviews";
import { dailyConfigured } from "@/lib/daily";
import { InterviewCards } from "@/components/work/InterviewCards";
import { BookInterview } from "@/components/work/BookInterview";
import { slotsForInterview } from "@/lib/open-times";
import { JobStrip } from "@/components/hire/JobFrame";
import type { StripStep } from "@/lib/job-strip";
import type { InterviewRow } from "@/lib/interviews";
import { ConfirmAvailability, type AvailabilityView } from "@/components/work/ConfirmAvailability";
import { ServiceDescriptionView } from "@/components/hire/ServiceDescriptionView";

export const metadata = { title: "Request · Panameer" };

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ decline?: string }>;
}) {
  const viewer = await guardPage("canProvideServices");
  const { id } = await params;

  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: { id: true },
  });

  const detail = await getWorkDetailForProvider({
    id,
    providerPersonId: person?.id ?? null,
  });

  if (!detail) notFound();

  const eligibility = person
    ? await proposeEligibility(person.id, detail.id)
    : null;
  // SE-E004 / CA-E002: asked in a Sourcing Event → the job's dates, the buyer's range, a countdown, I Want This Job or Not This Time.
  const sourcing = person ? await providerEventView(person.id, detail.id) : null;
  // DB-E008: the provider's interview page — offer times, guidelines, Join.
  const interviews = person ? await listInterviews({ providerPersonId: person.id, jobId: detail.id }) : [];

  const strip = await providerStrip(person?.id ?? "", detail.id, interviews, !!sourcing);
  const meta = [
    detail.budgetLabel,
    detail.experienceLevel,
    detail.duration,
    detail.worksite,
    detail.location,
    detail.roleType,
  ].filter(Boolean) as string[];

  return (
    <div className="mx-auto w-full max-w-5xl">
      <BackLink href="/find-work" label="Jobs" />

      <h1 className="font-display text-[28px] font-bold tracking-[-0.5px]">
        {detail.title}
      </h1>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[14px] text-ink-2">
        {detail.postedAgo && <span>Posted {detail.postedAgo}</span>}
        {strip.pill && <span className={`rounded-full px-3 py-0.5 text-[12.5px] font-bold ${strip.pillTone === "ok" ? "bg-state-accepted-bg text-state-accepted" : strip.pillTone === "no" ? "bg-state-declined-bg text-state-declined" : "bg-state-pending-bg text-state-pending"}`} data-provider-pill>{strip.pill}</span>}
      </div>
      {/* OJ-E008: the provider's own strip — Asked · Answered · Interview · Decision · Work Order. */}
      <div className="mt-5"><JobStrip steps={strip.steps} /></div>

      <div className="mt-6 grid gap-5 min-[900px]:grid-cols-[1fr_300px] min-[900px]:items-start">
        <div className="min-w-0">
          {interviews.length > 0 && (
            <section id="interview" className="mt-5 flex flex-col gap-3">
              <h2 className="text-[17px] font-extrabold">Interview</h2>
              {/* IW-E005: Open Times invitations — book a slot (or cancel a booked one); older interviews keep the offer-times cards. */}
              {await Promise.all(interviews.filter((r) => r.slotMinutes && (r.status === "REQUESTED" || r.status === "SCHEDULED")).map(async (r) => (
                <BookInterview key={r.id} interviewId={r.id} company={r.buyerCompany} jobTitle={r.jobTitle} minutes={r.slotMinutes!} booked={r.status === "SCHEDULED" ? r.startsAt : null}
                  slots={r.status === "REQUESTED" ? (await slotsForInterview(viewer, r.id)).map((d) => d.toISOString()) : []} />
              )))}
              {interviews.some((r) => !(r.slotMinutes && r.status === "REQUESTED")) && <InterviewCards rows={interviews.filter((r) => !(r.slotMinutes && r.status === "REQUESTED"))} side="provider" videoReady={dailyConfigured()} />}
            </section>
          )}
          {sourcing && (
            <div className="mt-5">
              <ConfirmAvailability jobId={detail.id} v={{ mode: "asked", askedCount: sourcing.askedCount, positions: sourcing.positions, dates: sourcing.dates, range: sourcing.range, rateCardCents: sourcing.rateCardCents, responded: sourcing.proposed ? { rateCents: sourcing.proposed.rateCents, note: sourcing.proposed.note } : null, declined: sourcing.declined, declineReason: sourcing.declineReason, open: sourcing.open, deadlineAt: sourcing.deadlineAt, eventNumber: sourcing.eventNumber }} startDeclining={(await searchParams)?.decline === "1"} />
            </div>
          )}
          {!sourcing && eligibility?.can && (
            <div className="mt-5">
              <ConfirmAvailability jobId={detail.id} v={await openAvailability(person!.id, detail.id, eligibility.existing ? { rateCents: eligibility.existing.rate?.unitPriceCents ?? null, note: eligibility.existing.coverNote } : null)} />
            </div>
          )}

          {}
          {!sourcing && eligibility && !eligibility.can && eligibility.code !== "REQUEST_NOT_OPEN" && (
            <div className="mt-5 rounded-brand border border-line bg-white p-5">
              <p className="text-[15px] text-ink-2">{eligibility.message}</p>
              {}
              {eligibility.existing?.rate && (
                <p className="mt-2 text-[14px] text-ink-2">
                  You said you&apos;re available at $
                  {(eligibility.existing.rate.unitPriceCents / 100).toFixed(2)}
                  {eligibility.existing.rate.basis === "RATE" ? " per hour" : " as a fixed fee"}.
                </p>
              )}
            </div>
          )}
          {/* OJ-E008: The Job last, collapsed — the provider acts on the interview and their answer first. */}
          <details className="group mt-5 rounded-brand border border-line bg-white p-5" open={!sourcing && !interviews.length} data-the-job>
            <summary className="flex cursor-pointer list-none items-center justify-between text-[16px] font-extrabold [&::-webkit-details-marker]:hidden">The Job<span aria-hidden className="text-ink-3 transition-transform group-open:rotate-180">▾</span></summary>
            {meta.length > 0 && <p className="mt-2 text-[13.5px] text-ink-2">{meta.join(" · ")}</p>}
            {detail.skills.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{detail.skills.map((s) => <span key={s} className="rounded-full border border-line px-2.5 py-0.5 text-[12px] text-ink-2">{s}</span>)}</div>}
            {detail.description && <p className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed text-ink-2">{detail.description}</p>}
            {sourcing && <div className="mt-4"><ServiceDescriptionView jobId={detail.id} editable={false} /></div>}
          </details>
        </div>

        {}
        <div className="min-w-0 rounded-brand border border-line bg-white p-5">
          <WhoIsAsking identity={detail.identity} />
        </div>
      </div>
    </div>
  );
}

/** CA-E006: the one-click card on a posted job — the job's dates and range, the provider's rate card. */
async function openAvailability(personId: string, jobId: string, responded: { rateCents: number | null; note: string | null } | null): Promise<AvailabilityView> {
  const job = await prisma.job.findUnique({ where: { id: jobId }, select: { budget_type: true, budget_min_cents: true, budget_max_cents: true, start_date: true, end_date: true } });
  return {
    mode: "open", open: true, responded,
    dates: { start: job?.start_date?.toISOString().slice(0, 10) ?? null, end: job?.end_date?.toISOString().slice(0, 10) ?? null },
    range: { type: job?.budget_type ?? "HOURLY", minCents: job?.budget_min_cents ?? null, maxCents: job?.budget_max_cents ?? null },
    rateCardCents: await rateCardFor(personId, jobId),
  };
}

/** OJ-E008: Asked · Answered · Interview · Decision · Work Order — done = green ✓ with the fact, current = magenta. */
async function providerStrip(personId: string, jobId: string, interviews: InterviewRow[], asked: boolean) {
  const [req, prop, wo] = await Promise.all([
    prisma.proposalRequest.findFirst({ where: { job_id: jobId, provider_person_id: personId }, orderBy: { created_at: "desc" }, select: { created_at: true, status: true } }),
    prisma.proposal.findUnique({ where: { job_id_provider_person_id: { job_id: jobId, provider_person_id: personId } }, select: { status: true, lines: { take: 1, orderBy: { line_number: "asc" }, select: { unit_price_cents: true, basis: true } } } }).catch(() => null),
    prisma.workOrder.findFirst({ where: { provider_person_id: personId, workRequest: { job_id: jobId }, status: { not: "CANCELLED" } }, select: { order_number: true } }),
  ]);
  const day = (d: Date) => d.toLocaleDateString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric" });
  const answered = !!prop && !["DRAFT", "WITHDRAWN"].includes(prop.status);
  const rate = prop?.lines[0]?.unit_price_cents != null ? `$${Math.round(prop.lines[0].unit_price_cents / 100)}${prop.lines[0].basis === "RATE" ? "/hr" : ""}` : "";
  const iv = interviews.find((r) => r.status === "SCHEDULED") ?? interviews.find((r) => r.status === "COMPLETED") ?? interviews.find((r) => ["REQUESTED", "SLOTS_OFFERED"].includes(r.status));
  const decided = prop?.status === "AWARDED" ? "Hired" : prop && ["NOT_SELECTED", "DECLINED"].includes(prop.status) ? "Not Selected" : null;
  const steps: StripStep[] = [
    { key: "create", label: "Asked", state: "done", top: req ? `✓ ${day(req.created_at)}` : "✓ Posted" },
    { key: "matches", label: "Answered", state: answered ? "done" : req?.status === "DECLINED" ? "done" : "current", top: answered ? `✓ ${rate}` : req?.status === "DECLINED" ? "✓ Not This Time" : "Now" },
    { key: "interview", label: "Interview", state: iv?.status === "COMPLETED" || (decided && iv) ? "done" : iv && answered ? "current" : "later", top: !iv ? "" : iv.status === "COMPLETED" ? "✓ Done" : iv.startsAt ? new Date(iv.startsAt).toLocaleString("en-US", { timeZone: "America/New_York", weekday: "short", hour: "numeric", minute: "2-digit" }) : "Pick a Time" },
    { key: "hire", label: "Decision", state: decided ? "done" : answered && (!iv || iv.status === "COMPLETED") ? "current" : "later", top: decided ? `✓ ${decided}` : "" },
    { key: "wo", label: "Order", state: wo ? "done" : decided === "Hired" ? "current" : "later", top: wo ? "✓ Issued" : "" },
  ];
  const pill = decided === "Hired" ? "You're Hired" : decided ? "Not Selected" : prop?.status === "SHORTLISTED" ? "You're Shortlisted" : answered ? "You Answered" : req?.status === "DECLINED" ? "Not This Time" : asked ? "Asked for Your Availability" : null;
  return { steps, pill, pillTone: decided === "Not Selected" ? "no" : decided || prop?.status === "SHORTLISTED" || answered ? "ok" : "pend" };
}
