import { VerifiedTag } from "@/components/company/VerifiedTag";
import { CompanyLink } from "@/components/company/CompanyLink";
import { notFound, redirect } from "next/navigation";
import { checkTransact, guardPage } from "@/lib/guard";
import { getSessionViewer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/casing/Button";
import { formatCents } from "@/lib/display";
import { WorkRequestLines } from "@/components/work/WorkRequestLines";
import { getWorkRequestDetail } from "@/lib/work-request-lines";
import { invitedOn } from "@/lib/work-request-invite";
import { proposalsOn } from "@/lib/proposals";
import { ProposalSteps } from "@/components/work/ProposalSteps";
import { SelectProposal, AssignDirectly, CreateOrder } from "@/components/work/HireControls";
import { matchProvidersFor } from "@/lib/work-request-match";
import {
  WORK_REQUEST_STATUS_LABEL,
  workRequestStatusPillClass,
} from "@/lib/work-request-status";
import { WorkRequestError } from "@/lib/work-request";
import { BackLink } from "@/components/console/BackLink";

export const metadata = { title: "Work Request · Panameer" };

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await guardPage("canHireTalent");
  const viewer = await getSessionViewer();
  const { id } = await params;
  if (!viewer) redirect(`/login?callbackUrl=${encodeURIComponent(`/work-requests/${id}`)}`);

  const transact = await checkTransact(viewer);
  if (!transact.ok) {
    redirect(
      `/company?blocked=${transact.reason}&from=${encodeURIComponent(`/work-requests/${id}`)}`
    );
  }

  let detail;
  let erpReturned = false;
  try {
    detail = await getWorkRequestDetail(viewer, id);
    erpReturned = !!(await prisma.workRequest.findUnique({ where: { id }, select: { erp_returned_at: true } }))?.erp_returned_at;
  } catch (e) {
    if (e instanceof WorkRequestError && (e.code === "NOT_FOUND" || e.code === "NOT_A_BUYER"))
      notFound();
    throw e;
  }

  const [{ providers }, invited, proposals] = await Promise.all([
    matchProvidersFor(viewer, id),
    invitedOn(viewer, id),
    proposalsOn(viewer, id),
  ]);
  const memberships = await prisma.companyMembership.findMany({
    where: { person_id: { in: proposals.map((p) => p.providerPersonId) }, status: "APPROVED" },
    select: { person_id: true, company: { select: { id: true, name: true } } },
  });
  const providerCompany = new Map(memberships.map((m) => [m.person_id, m.company]));

  const sendableTests = (
    await prisma.certificationTest.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, learningPath: { select: { title: true } } },
      orderBy: { created_at: "asc" },
    })
  ).map((t) => ({ id: t.id, title: t.learningPath?.title ?? "Path test" }));

  const profiles = await prisma.providerProfile.findMany({
    where: { id: { in: providers.map((p) => p.profileId) } },
    select: { id: true, person_id: true },
  });
  const personOf = new Map(profiles.map((p) => [p.id, p.person_id]));
  const options = providers
    .map((p) => ({
      personId: personOf.get(p.profileId) ?? "",
      name: p.name,
      headline: p.headline,
    }))
    .filter((p) => p.personId);

  const posted = detail.status === "POSTED";

  return (
    <div className="mx-auto w-full max-w-4xl">
      <BackLink href="/hire" label="Work Requests" />

      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-[28px] font-bold tracking-[-0.5px]">
            {detail.title.trim() || "Untitled request"}
          </h1>
          <p className="mt-1.5 text-[14px] text-ink-2">
            {detail.roleName && <>{detail.roleName} · </>}
            {}
            {posted && detail.postedAt
              ? `Posted ${detail.postedAt.slice(0, 10)}`
              : WORK_REQUEST_STATUS_LABEL[detail.status]}
          </p>
        </div>
        {/* ONE PLACE — this pill read `posted ? … : "Draft"` */}
        <span className="inline-flex flex-col items-end">
          <span className={workRequestStatusPillClass(detail.status)}>
            {WORK_REQUEST_STATUS_LABEL[detail.status]}
          </span>
          {detail.status === "ASSIGNED" && erpReturned && <span className="mt-1 text-[12px] text-ink-2">Returned to ERP — waiting for the PO</span>}
        </span>
      </div>

      {/* ══ HEADER FACTS ═══════════════════════════════════════════════════ */}
      <dl className="mt-6 grid gap-x-8 gap-y-3.5 rounded-brand border border-line bg-white p-5 sm:grid-cols-3">
        <Fact label="Dates">
          {detail.startDate || detail.endDate
            ? `${detail.startDate ?? "…"} → ${detail.endDate ?? "…"}`
            : "Not set"}
        </Fact>
        <Fact label="Budget">
          {detail.budgetAmountCents != null
            ? `${formatCents(detail.budgetAmountCents, detail.currency)}${
                detail.budgetType === "HOURLY" ? " / hr" : ""
              }`
            : detail.budgetMinCents != null && detail.budgetMaxCents != null
              ? `${formatCents(detail.budgetMinCents, detail.currency)}–${formatCents(
                  detail.budgetMaxCents,
                  detail.currency
                )}${detail.budgetType === "HOURLY" ? " / hr" : ""}`
              : "Not set"}
        </Fact>
        <Fact label="Worksite">{detail.worksite ?? "Not set"}</Fact>
        <Fact label="Experience">{detail.experienceLevel ?? "Not set"}</Fact>
        <Fact label="Duration">{detail.duration ?? "Not set"}</Fact>
        <Fact label="Skills">
          {detail.skillNames.length ? detail.skillNames.slice(0, 6).join(", ") : "None"}
        </Fact>
      </dl>

      {detail.description && (
        <p className="mt-5 whitespace-pre-wrap text-[15px] leading-relaxed text-ink-2">
          {detail.description}
        </p>
      )}

      {/* POST LIVES HERE TOO, not only at the end of the wizard. A requester who */}
      {/* DRAFT-ONLY, NOT "NOT POSTED" */}
      {detail.status === "DRAFT" && (
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-brand border border-line bg-white p-5">
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold">This request is still a draft</p>
            <p className="mt-0.5 text-[14px] text-ink-2">
              Posting makes it visible to providers looking for work.
            </p>
          </div>
          <Button href={`/create-work`} variant="ghost">
            Open in the wizard
          </Button>
        </div>
      )}

      <div className="mt-8">
        {/* state across a `router.refresh()` — so after selecting, the section */}
        <WorkRequestLines key={detail.status} initial={detail} />
      </div>

      {/* THE PROPOSALS THAT CAME BACK */}
      {/* THE BRANCH WS-B) — NOT RENDERED, NOT HIDDEN */}
      {!detail.soleSourced && (
      <div className="mt-8">
        <h2 className="font-display text-[20px] font-bold tracking-[-0.3px]">
          Proposals <span className="font-normal text-ink-2">({proposals.length})</span>
        </h2>
        {proposals.length === 0 ? (
          // AN HONEST ZERO WITH THE FIRST MOVE NAMED (§4), not a report of
          <p className="mt-3 text-[14.5px] text-ink-2">
            {posted
              ? "No proposals yet. Providers can find this request, and inviting someone puts it in front of them directly."
              : "No proposals yet. A request takes proposals once it is posted."}
          </p>
        ) : (
          <>
            {/* THE ORDER IS STATED BECAUSE IT IS NOT A RANKING. Sorting by */}
            <p className="mt-1 text-[13px] text-ink-2">In the order they arrived.</p>
            <ul className="mt-3 grid gap-3">
              {proposals.map((p) => (
                <li
                  key={p.id}
                  className="rounded-[12px] border border-line bg-white px-4 py-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
                    <span className="font-semibold">
                      {p.providerName}
                      {providerCompany.get(p.providerPersonId) && (
                        <span className="font-normal text-ink-2">
                          {" · "}
                          <CompanyLink id={providerCompany.get(p.providerPersonId)!.id} name={providerCompany.get(p.providerPersonId)!.name} />
                          <VerifiedTag companyId={providerCompany.get(p.providerPersonId)!.id} />
                        </span>
                      )}
                    </span>
                    <span className="rounded-full bg-ink/[0.05] px-3 py-0.5 text-[12.5px] font-bold text-ink">
                      {p.statusLabel}
                    </span>
                  </div>

                  <p className="mt-1.5 text-[15px]">
                    {/* RULING 18. A dash means *we cannot count this*; a proposal */}
                    {p.rate ? (
                      <>
                        <span className="font-bold">
                          {formatCents(p.rate.unitPriceCents)}
                        </span>
                        <span className="text-ink-2">
                          {p.rate.basis === "RATE" ? " per hour" : " fixed fee"}
                        </span>
                      </>
                    ) : (
                      <span className="text-ink-2">No rate given</span>
                    )}
                  </p>

                  <p className="mt-1 text-[13.5px] text-ink-2">
                    {p.proposalNumber}
                    {p.invited ? " · Invited" : " · Found this request"}
                    {p.submittedAt && (
                      <> · sent {p.submittedAt.toISOString().slice(0, 10)}</>
                    )}
                    {p.validUntil && (
                      <> · good until {p.validUntil.toISOString().slice(0, 10)}</>
                    )}
                  </p>

                  {p.coverNote && (
                    <p className="mt-2 whitespace-pre-wrap text-[14.5px] leading-relaxed text-ink-2">
                      {p.coverNote}
                    </p>
                  )}

                  {/* THE TWO OPTIONAL STEPS ( WS-E) */}
                  <ProposalSteps
                    workRequestId={detail.id}
                    providerPersonId={p.providerPersonId}
                    providerName={p.providerName}
                    interviewStatus={p.interviewStatus}
                    testStatus={p.testStatus}
                    tests={sendableTests}
                  />

                  {/* TRANSITION ONE ( WS-F) */}
                  <SelectProposal
                    workRequestId={detail.id}
                    providerPersonId={p.providerPersonId}
                    providerName={p.providerName}
                    hasRate={p.rate !== null}
                    selected={p.status === "AWARDED"}
                  />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      )}

      {/* THE OTHER ROUTE, AND THE SECOND TRANSITION ( WS-F) */}
      {(detail.status === "DRAFT" || detail.status === "POSTED") && options.length > 0 && (
        <AssignDirectly workRequestId={detail.id} providers={options} />
      )}
      {detail.status === "ASSIGNED" && <CreateOrder workRequestId={detail.id} />}

      {/* WHO HAS BEEN INVITED */}
      {/* THE SECOND HALF OF THE SAME BRANCH WS-B). Guarded on the same */}
      {!detail.soleSourced && (
      <div className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-[20px] font-bold tracking-[-0.3px]">
            Invited to bid <span className="font-normal text-ink-2">({invited.length})</span>
          </h2>
          <Button href={`/work-requests/${id}/invite`} variant="ghost">
            Invite providers
          </Button>
        </div>
        {invited.length === 0 ? (
          <p className="mt-3 text-[14.5px] text-ink-2">
            Nobody has been invited yet. Inviting a provider puts your request in
            front of them directly — anyone else can still find it and bid.
          </p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {invited.map((i) => (
              <li
                key={i.requestNumber}
                className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] border border-line bg-white px-4 py-3"
              >
                <span className="font-semibold">{i.name}</span>
                <span className="text-[13.5px] text-ink-2">
                  Line {i.lineNumber} · {i.requestNumber}
                  {i.respondsBy && <> · responds by {i.respondsBy}</>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      )}

      <div className="mt-9 flex flex-wrap items-center gap-4 border-t border-line pt-6">
        <Button href="/hire" variant="ghost">
          All Work Requests
        </Button>
        {posted && (
          <Button href={`/work-requests/${id}/share`} variant="quiet">
            Share it with providers
          </Button>
        )}
      </div>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[12.5px] font-bold uppercase tracking-[0.08em] text-ink-2">
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-[14.5px]">{children}</dd>
    </div>
  );
}
