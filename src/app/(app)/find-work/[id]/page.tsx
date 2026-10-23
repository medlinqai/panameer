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
import { FoldSection } from "@/components/casing/FoldSection";
import { ReconfirmButton } from "@/components/hire/AmendJob";
import { amendmentsFor } from "@/lib/job-actions";
import { GuidelinesLink, InterviewQuickActions } from "@/components/work/InterviewQuickActions";
import { Countdown } from "@/components/hire/Countdown";
import { AnswerQuestions } from "@/components/work/AnswerQuestions";
import { providerQuestions } from "@/lib/job-questions";
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

  const questionSets = person ? await providerQuestions(person.id, detail.id) : [];
  const amendments = await amendmentsFor(detail.id);
  const reconfirmNeeded = !!person && (await prisma.proposal.count({ where: { job_id: detail.id, provider_person_id: person.id, reconfirm_needed_at: { not: null }, reconfirmed_at: null } })) > 0;
  const history = person ? await providerHistory(person.id, detail.id) : [];
  const strip = await providerStrip(person?.id ?? "", detail.id, interviews, !!sourcing);
  // PJ-E002: one-line summaries and the one open section (the current step's).
  const fmtWhen = (iso: string) => new Date(iso).toLocaleString("en-US", { timeZone: "America/New_York", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const ivBooked = interviews.find((r) => r.status === "SCHEDULED") ?? null;
  const ivInvite = interviews.find((r) => r.slotMinutes && r.status === "REQUESTED") ?? null;
  const ivSummary = ivBooked?.startsAt ? `Booked · ${fmtWhen(ivBooked.startsAt)}` : ivInvite ? `Invited · ${ivInvite.slotMinutes} min · Pick a Time` : interviews.find((r) => r.status === "COMPLETED") ? "Done" : interviews.find((r) => r.status === "SLOTS_OFFERED") ? "Times offered — waiting for the buyer" : interviews.find((r) => r.status === "REQUESTED") ? "Asked — offer a few times" : "Closed";
  const qOpen = questionSets.find((q) => !q.submittedAt);
  const qSummary = qOpen ? `${qOpen.questions.length} Question${qOpen.questions.length === 1 ? "" : "s"}${qOpen.dueAt ? ` · Answer by ${new Date(qOpen.dueAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}` : questionSets[0] ? `${questionSets[0].questions.length} Answers · Sent` : null;
  const answeredCents = sourcing?.proposed?.rateCents ?? eligibility?.existing?.rate?.unitPriceCents ?? null;
  const per = (sourcing?.range.type ?? "HOURLY") === "FIXED" ? "" : "/hr";
  const availSummary = answeredCents != null
    ? <>${Math.round(answeredCents / 100)}{per}{sourcing?.open && sourcing.deadlineAt ? <> · <Countdown at={sourcing.deadlineAt} plain /> left</> : null}</>
    : sourcing?.declined ? "Not This Time" : sourcing && !sourcing.open ? "Closed" : "Not answered yet";
  const jobSummary = [detail.worksite, detail.location, detail.budgetLabel, detail.duration].filter(Boolean).join(" · ");
  const openKey = qOpen ? "questions" : ivInvite || ivBooked ? "interview" : answeredCents == null && (sourcing?.open || eligibility?.can) && !sourcing?.declined ? "availability" : interviews.length && strip.steps.find((x) => x.state === "current")?.label === "Decision" ? "interview" : "job";
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
      {/* PJ-E003: what happened so far, newest first — the Work History dot timeline, collapsed. */}
      {history.length > 0 && (
        <div className="mt-3">
          <FoldSection id="history" storageKey={detail.id} title={`History (${history.length})`} summary={history[0].text}>
            <ol className="ml-1" data-history>
              {history.map((h, i) => (
                <li key={i} className="relative pb-4 pl-7 last:pb-0">
                  {i < history.length - 1 && <span aria-hidden className="absolute bottom-0 left-[3px] top-[14px] border-l border-dashed border-magenta" />}
                  <span aria-hidden className="absolute left-0 top-[6px] h-2 w-2 rounded-full bg-magenta" />
                  <p className="text-[14px]"><b>{h.text}</b> <span className="text-ink-2">· {h.when}</span></p>
                </li>
              ))}
            </ol>
          </FoldSection>
        </div>
      )}

      <div className="mt-4 grid gap-5 min-[900px]:grid-cols-[1fr_280px] min-[900px]:items-start">
        <div className="min-w-0 border-b border-line" data-job-sections>
          {/* JS-E005: an Amendment after you answered — review the changes and re-confirm (or change your answer). */}
          {amendments.length > 0 && (
            <FoldSection id="amendment" storageKey={detail.id} title={`Amendment ${amendments[0].number}`} defaultOpen={reconfirmNeeded}
              summary={reconfirmNeeded ? "Review the changes and re-confirm" : "Re-confirmed"} action={reconfirmNeeded ? <ReconfirmButton jobId={detail.id} /> : null}>
              {amendments.map((a) => (
                <div key={a.number} className="mb-3" data-amendment={a.number}>
                  <p className="text-[13.5px]"><b>Amendment {a.number}</b> · <span className="text-ink-2">{new Date(a.at).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · “{a.reason}”</span></p>
                  <ul className="mt-1.5 text-[13.5px]">{a.changes.map((c) => <li key={c.field}><b>{c.label}:</b> <span className="text-ink-3 line-through">{c.before || "—"}</span> → <b>{c.after || "—"}</b></li>)}</ul>
                </div>
              ))}
              {reconfirmNeeded && <p className="text-[12.5px] text-ink-2">Re-Confirm keeps your rate and answers. To change them, open Your Availability or Questions.</p>}
            </FoldSection>
          )}
          {/* PJ-E002: sections in acting order, one line each when closed; only the current step's is open. */}
          {interviews.length > 0 && (
            <FoldSection id="interview" storageKey={detail.id} title="Interview" defaultOpen={openKey === "interview"}
              summary={ivSummary}
              action={ivBooked && ivBooked.status === "SCHEDULED" ? <InterviewQuickActions interviewId={ivBooked.id} hasRoom={ivBooked.hasRoom} /> : null}>
              <div className="flex flex-col gap-3">
                {/* IW-E005: an Open Times invitation books a slot; booked or older interviews show one card (Join, Add to Calendar). */}
                {await Promise.all(interviews.filter((r) => r.slotMinutes && r.status === "REQUESTED").map(async (r) => (
                  <BookInterview key={r.id} interviewId={r.id} company={r.buyerCompany} jobTitle={r.jobTitle} minutes={r.slotMinutes!} booked={null}
                    slots={(await slotsForInterview(viewer, r.id)).map((d) => d.toISOString())} />
                )))}
                {interviews.some((r) => !(r.slotMinutes && r.status === "REQUESTED")) && <InterviewCards guidelines={false} rows={interviews.filter((r) => !(r.slotMinutes && r.status === "REQUESTED"))} side="provider" videoReady={dailyConfigured()} />}
                <GuidelinesLink />
              </div>
            </FoldSection>
          )}
          {questionSets.length > 0 && (
            <FoldSection id="questions" storageKey={detail.id} title="Questions" defaultOpen={openKey === "questions"} summary={qSummary}>
              <div className="flex flex-col gap-3">{questionSets.map((q) => <AnswerQuestions key={q.answerId} set={q} />)}</div>
            </FoldSection>
          )}
          {(sourcing || eligibility) && (
            <FoldSection id="availability" storageKey={detail.id} title="Your Availability" defaultOpen={openKey === "availability"} summary={availSummary}>
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
            </FoldSection>
          )}
          <FoldSection id="job" storageKey={detail.id} title="The Job" defaultOpen={openKey === "job"} summary={jobSummary}>
            {meta.length > 0 && <p className="text-[13.5px] text-ink-2">{meta.join(" · ")}</p>}
            {detail.skills.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{detail.skills.map((s) => <span key={s} className="rounded-full border border-line px-2.5 py-0.5 text-[12px] text-ink-2">{s}</span>)}</div>}
            {detail.description && <p className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed text-ink-2">{detail.description}</p>}
            {sourcing && <div className="mt-4"><ServiceDescriptionView jobId={detail.id} editable={false} /></div>}
          </FoldSection>
        </div>

        {}
        <div className="min-w-0">
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
  const qaSent = (await prisma.questionAnswer.count({ where: { provider_person_id: personId, questionSet: { job_id: jobId }, submitted_at: { not: null } } })) > 0;
  const decided = prop?.status === "AWARDED" ? "Hired" : prop && ["NOT_SELECTED", "DECLINED"].includes(prop.status) ? "Not Selected" : null;
  const steps: StripStep[] = [
    { key: "create", label: "Asked", state: "done", top: req ? `✓ ${day(req.created_at)}` : "✓ Posted" },
    { key: "matches", label: "Answered", state: answered ? "done" : req?.status === "DECLINED" ? "done" : "current", top: answered ? `✓ ${rate}` : req?.status === "DECLINED" ? "✓ Not This Time" : "Now" },
    { key: "interview", label: "Interview & Questions", state: iv?.status === "COMPLETED" || qaSent || (decided && iv) ? "done" : iv && answered ? "current" : "later", top: qaSent && !iv ? "✓ Answered" : !iv ? "" : iv.status === "COMPLETED" ? "✓ Done" : iv.startsAt ? new Date(iv.startsAt).toLocaleString("en-US", { timeZone: "America/New_York", weekday: "short", hour: "numeric", minute: "2-digit" }) : "Pick a Time" },
    { key: "hire", label: "Decision", state: decided ? "done" : answered && (!iv || iv.status === "COMPLETED" || qaSent) ? "current" : "later", top: decided ? `✓ ${decided}` : "" },
    { key: "wo", label: "Order", state: wo ? "done" : decided === "Hired" ? "current" : "later", top: wo ? "✓ Issued" : "" },
  ];
  const pill = decided === "Hired" ? "You're Hired" : decided ? "Not Selected" : prop?.status === "SHORTLISTED" ? "You're Shortlisted" : answered ? "You Answered" : req?.status === "DECLINED" ? "Not This Time" : asked ? "Asked for Your Availability" : null;
  return { steps, pill, pillTone: decided === "Not Selected" ? "no" : decided || prop?.status === "SHORTLISTED" || answered ? "ok" : "pend" };
}

/** PJ-E003: this provider's history on the job, newest first. */
async function providerHistory(personId: string, jobId: string) {
  const [req, prop, ivs, qas, wo] = await Promise.all([
    prisma.proposalRequest.findFirst({ where: { job_id: jobId, provider_person_id: personId }, orderBy: { created_at: "desc" }, select: { created_at: true, declined_at: true } }),
    prisma.proposal.findUnique({ where: { job_id_provider_person_id: { job_id: jobId, provider_person_id: personId } }, select: { status: true, submitted_at: true, updated_at: true, lines: { take: 1, orderBy: { line_number: "asc" }, select: { unit_price_cents: true, basis: true } } } }).catch(() => null),
    prisma.interviewRequest.findMany({ where: { job_id: jobId, provider_person_id: personId }, select: { created_at: true, status: true, completed_at: true, confirmed_line_id: true, response: { select: { lines: { select: { id: true, starts_at: true } } } } } }),
    prisma.questionAnswer.findMany({ where: { provider_person_id: personId, questionSet: { job_id: jobId } }, select: { created_at: true, submitted_at: true } }),
    prisma.workOrder.findFirst({ where: { provider_person_id: personId, workRequest: { job_id: jobId }, status: { not: "CANCELLED" } }, select: { created_at: true, order_number: true } }),
  ]);
  const at = (d: Date) => d.toLocaleString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const ev: { t: Date; text: string }[] = [];
  if (req) ev.push({ t: req.created_at, text: "Asked for your availability" });
  if (req?.declined_at) ev.push({ t: req.declined_at, text: "You said Not This Time" });
  const l = prop?.lines[0];
  if (prop?.submitted_at) ev.push({ t: prop.submitted_at, text: `Answered${l?.unit_price_cents != null ? ` $${Math.round(l.unit_price_cents / 100)}${l.basis === "RATE" ? "/hr" : ""}` : ""}` });
  for (const iv of ivs) {
    ev.push({ t: iv.created_at, text: "Interview requested" });
    const line = iv.response?.lines.find((x) => x.id === iv.confirmed_line_id);
    if (line) ev.push({ t: line.starts_at, text: `Interview ${iv.status === "COMPLETED" ? "held" : iv.status === "SCHEDULED" ? "booked" : iv.status.toLowerCase()} ${line.starts_at.toLocaleString("en-US", { timeZone: "America/New_York", weekday: "short", hour: "numeric", minute: "2-digit" })}` });
  }
  for (const q of qas) { ev.push({ t: q.created_at, text: "Questions received" }); if (q.submitted_at) ev.push({ t: q.submitted_at, text: "Questions answered" }); }
  if (prop?.status === "AWARDED") ev.push({ t: prop.updated_at, text: "You were hired" });
  if (prop && ["NOT_SELECTED"].includes(prop.status)) ev.push({ t: prop.updated_at, text: "Not selected this time" });
  if (wo) ev.push({ t: wo.created_at, text: `Order ${wo.order_number} issued` });
  return ev.sort((a, b) => b.t.getTime() - a.t.getTime()).map((e) => ({ text: e.text, when: at(e.t) }));
}
