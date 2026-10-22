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
import { ConfirmAvailability, type AvailabilityView } from "@/components/work/ConfirmAvailability";
import { ServiceDescriptionView } from "@/components/hire/ServiceDescriptionView";

export const metadata = { title: "Work Request · Panameer" };

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
      <BackLink href="/find-work" label="Work Requests" />

      <h1 className="font-display text-[28px] font-bold tracking-[-0.5px]">
        {detail.title}
      </h1>

      {}
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[14px] text-ink-2">
        {detail.postedAgo && <span>Posted {detail.postedAgo}</span>}
        {detail.stageLabel && (
          <span className="rounded-full bg-ink/[0.05] px-3 py-0.5 text-[12.5px] font-bold text-ink">
            {detail.stageLabel}
          </span>
        )}
      </div>

      <div className="mt-6 grid gap-5 min-[900px]:grid-cols-[1fr_300px] min-[900px]:items-start">
        <div className="min-w-0">
          <div className="rounded-brand border border-line bg-white p-5">
            {meta.length > 0 && (
              <p className="text-[13.5px] text-ink-2">{meta.join(" · ")}</p>
            )}

            {detail.skills.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {detail.skills.map((s) => (
                  <span
                    key={s}
                    className="rounded-full border border-line px-2.5 py-0.5 text-[12px] text-ink-2"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}

            {}
            {detail.description && (
              <p className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed text-ink-2">
                {detail.description}
              </p>
            )}
          </div>

          {interviews.length > 0 && (
            <section id="interview" className="mt-5">
              <h2 className="mb-2 text-[17px] font-extrabold">Interview</h2>
              <InterviewCards rows={interviews} side="provider" videoReady={dailyConfigured()} />
            </section>
          )}
          {sourcing && (
            <div className="mt-5">
              <ConfirmAvailability jobId={detail.id} v={{ mode: "asked", dates: sourcing.dates, range: sourcing.range, rateCardCents: sourcing.rateCardCents, responded: sourcing.proposed ? { rateCents: sourcing.proposed.rateCents, note: sourcing.proposed.note } : null, declined: sourcing.declined, declineReason: sourcing.declineReason, open: sourcing.open, deadlineAt: sourcing.deadlineAt, eventNumber: sourcing.eventNumber }} startDeclining={(await searchParams)?.decline === "1"} />
              <ServiceDescriptionView jobId={detail.id} editable={false} />
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
