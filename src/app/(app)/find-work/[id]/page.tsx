import { notFound } from "next/navigation";
import { guardPage } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { BackLink } from "@/components/console/BackLink";
import { WhoIsAsking } from "@/components/work/WhoIsAsking";
import { ProposeRate } from "@/components/work/ProposeRate";
import { getWorkDetailForProvider } from "@/lib/work-detail";
import { proposeEligibility } from "@/lib/proposals";

export const metadata = { title: "Work Request · Panameer" };

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
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

          {}
          {eligibility?.can && (
            <div className="mt-5">
              <ProposeRate
                workRequestId={detail.id}
                existing={
                  eligibility.existing
                    ? {
                        unitPriceCents: eligibility.existing.rate?.unitPriceCents ?? null,
                        basis: eligibility.existing.rate?.basis ?? "RATE",
                        coverNote: eligibility.existing.coverNote,
                        validUntil:
                          eligibility.existing.validUntil?.toISOString() ?? null,
                        submittedAt:
                          eligibility.existing.submittedAt?.toISOString() ?? null,
                      }
                    : null
                }
              />
            </div>
          )}

          {}
          {eligibility && !eligibility.can && eligibility.code !== "REQUEST_NOT_OPEN" && (
            <div className="mt-5 rounded-brand border border-line bg-white p-5">
              <p className="text-[15px] text-ink-2">{eligibility.message}</p>
              {}
              {eligibility.existing?.rate && (
                <p className="mt-2 text-[14px] text-ink-2">
                  You proposed $
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
