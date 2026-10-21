import Link from "next/link";
import { WorkRequestPath } from "@/components/work/WorkRequestPath";
import { workRequestSections } from "@/lib/work-request-sections";
import { listInterviews } from "@/lib/interviews";
import { dailyConfigured } from "@/lib/daily";
import { InterviewCards } from "@/components/work/InterviewCards";
import { ActionsMenu } from "@/components/casing/ActionsMenu";
import { Card } from "@/components/home/LiveWork";
import { NeutralAvatar } from "@/components/Avatar";
import { identityVisibleTo, providerLabel, providerNumbers } from "@/lib/provider-number";
import { PENDING_ON_LABEL, WORK_ORDER_LABEL, waitingOn } from "@/lib/oracle-status";
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
import { proposalsOn } from "@/lib/proposals";
import { ProposalSteps } from "@/components/work/ProposalSteps";
import { SelectProposal, AssignDirectly, CreateOrder } from "@/components/work/HireControls";
import { matchProvidersFor } from "@/lib/work-request-match";
import {
  JOB_STATUS_LABEL,
  WORK_REQUEST_STATUS_LABEL,
  jobStatusPillClass,
} from "@/lib/work-request-status";
import { WorkRequestError } from "@/lib/work-request";
import { BackLink } from "@/components/console/BackLink";
import { ServiceDescriptionView } from "@/components/hire/ServiceDescriptionView";
import { MatchList } from "@/components/hire/MatchList";
import { hireMatches } from "@/lib/hire-questionnaire";
import { readServiceDescription } from "@/lib/service-description";
import { latestEventFor } from "@/lib/sourcing-events";
import { seesTestAccounts } from "@/lib/admin/test-accounts";

export const metadata = { title: "Job · Panameer" };

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

  const [{ providers }, proposals] = await Promise.all([
    matchProvidersFor(viewer, id),
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
  // AN-E003: the Job's matches show a Provider number until a Work Order exists with them.
  const [seen, numbers] = await Promise.all([identityVisibleTo(viewer, profiles.map((p) => p.person_id)), providerNumbers(profiles.map((p) => p.id))]);
  const options = providers
    .map((p) => {
      const personId = personOf.get(p.profileId) ?? "";
      return { personId, name: seen.has(personId) ? p.name : providerLabel(numbers.get(p.profileId)), headline: p.headline };
    })
    .filter((p) => p.personId);

  // SE-E002: the Job's Matches use the Hire ranking on its Service Description.
  const sdForMatches = await readServiceDescription(detail.id);
  const jobMatches = sdForMatches ? await hireMatches(sdForMatches, await seesTestAccounts(viewer), detail.id, viewer) : [];
  const sourcing = await latestEventFor(detail.id);
  const posted = detail.status === "OPEN";
  // Every line has a provider and a price, and the requisition isn't ordered yet → Create Order.
  const awarded = detail.completeness.complete && !["ORDERED", "CANCELLED"].includes(detail.workRequestStatus) && detail.status !== "FILLED";

  const sec = await workRequestSections(viewer, detail.id);
  const buyerInterviews = await listInterviews({ jobId: detail.id, buyerPersonId: (await prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { id: true } }))?.id });
  const muted = (t: string) => <p className="text-[13.5px] text-ink-3">{t}</p>;
  const actions = [
    ...(detail.status === "DRAFT" ? [{ label: "Edit the Job", href: `/hire?job=${detail.id}&step=0` }] : []),
    ...(sourcing ? [{ label: `Open Sourcing Event ${sourcing.event_number}`, href: `/hire/sourcing/${sourcing.id}` }] : []),
    ...(!detail.soleSourced ? [{ label: "Invite providers", href: `/work-requests/${id}/invite` }] : []),
    ...(posted ? [{ label: "Share with providers", href: `/work-requests/${id}/share` }] : []),
    ...sec.orders.map((o) => ({ label: `Open Work Order ${o.order_number}`, href: `/orders/${o.id}` })),
    { label: "My Jobs", href: "/hire/jobs" },
  ];

  return (
    <div className="mx-auto w-full max-w-4xl" data-work-request-page>
      <BackLink href="/hire/jobs" label="My Jobs" />

      {/* DB-E006 · 1 Header */}
      <header className="mt-2 rounded-brand border border-line bg-white p-4 sm:p-5" data-wr-header>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[12.5px] font-semibold text-ink-2">{[sec.jobNumber, sec.latestWr].filter(Boolean).join(" · ") || "Job"}</p>
            <h1 className="font-display text-[24px] font-bold tracking-[-0.4px] sm:text-[28px]">{detail.title.trim() || "Untitled job"}</h1>
            <p className="mt-1 text-[13.5px] text-ink-2">
              {[detail.roleName, posted && detail.postedAt ? `Posted ${detail.postedAt.slice(0, 10)}` : null, sec.provider ? `Provider ${sec.provider.replace(/^Provider /, "")}` : null].filter(Boolean).join(" · ")}
            </p>
          </div>
          <span className="flex items-center gap-2">
            <span className="inline-flex flex-col items-end">
              <span className={jobStatusPillClass(detail.status)}>{JOB_STATUS_LABEL[detail.status]}</span>
              {awarded && erpReturned && <span className="mt-1 text-[12px] text-ink-2">Returned to ERP — waiting for the PO</span>}
            </span>
            <ActionsMenu items={actions} />
          </span>
        </div>
      </header>

      {/* 2 Progress strip */}
      <WorkRequestPath jobId={detail.id} />

      {/* 3 Job details */}
      <SectionCard title="Job details">
        <ServiceDescriptionView jobId={id} editable={detail.status === "DRAFT"} bare />
      </SectionCard>

      {detail.status === "DRAFT" && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-brand border border-line bg-white p-4">
          <p className="min-w-0 flex-1 text-[14px]"><b>This Job is still a draft.</b> <span className="text-ink-2">Posting makes it visible to providers.</span></p>
          <Button href={`/create-work`} variant="ghost">Open in the wizard</Button>
        </div>
      )}

      {/* Shortlist — the Job's matches (star, quick view, Compare, Request Proposals). */}
      {(detail.status === "DRAFT" || detail.status === "OPEN") && !awarded && jobMatches.length > 0 && (
        <SectionCard id="matches" title="Matches">
          {sourcing && <p className="mb-1 text-[13.5px]">Sourcing Event <Link href={`/hire/sourcing/${sourcing.id}`} className="font-semibold text-magenta-dark underline underline-offset-4">{sourcing.event_number}</Link> · {sourcing.status === "OPEN" ? "Open" : sourcing.status === "AWARDED" ? "Awarded" : "Closed"}</p>}
          <MatchList jobId={detail.id} matches={jobMatches} state={sdForMatches?.state} />
        </SectionCard>
      )}

      {/* 4 Requests to Propose */}
      <SectionCard title={`Requests to Propose (${sec.requestRows.length})`}>
        {sec.requestRows.length ? (
          <ul className="divide-y divide-line text-[13.5px]">
            {sec.requestRows.map((r) => (
              <li key={r.number} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="flex items-center gap-2"><NeutralAvatar size={24} /><b>{r.who}</b></span>
                <span className="text-ink-2">asked {r.asked}{r.due ? ` · due ${r.due}` : ""} · <b className="text-ink">{r.status}</b></span>
              </li>
            ))}
          </ul>
        ) : muted("No requests to propose yet.")}
      </SectionCard>

      {/* 5 Proposals */}
      <SectionCard title={`Proposals (${proposals.length})`} right={sourcing ? <Link href={`/hire/sourcing/${sourcing.id}`} className="font-semibold text-magenta-dark underline underline-offset-4">Compare</Link> : null}>
        {proposals.length === 0 ? muted(posted ? "No proposals yet." : "No proposals yet — a Job takes proposals once it is posted.") : (
          <ul className="grid gap-3">
            {proposals.map((p) => (
              <li key={p.id} className="rounded-[10px] border border-line px-3.5 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">{p.providerName}{providerCompany.get(p.providerPersonId) && !p.providerName.startsWith("Provider ") && (
                    <span className="font-normal text-ink-2">{" · "}<CompanyLink id={providerCompany.get(p.providerPersonId)!.id} name={providerCompany.get(p.providerPersonId)!.name} /><VerifiedTag companyId={providerCompany.get(p.providerPersonId)!.id} /></span>
                  )}</span>
                  <span className="rounded-full bg-ink/[0.05] px-3 py-0.5 text-[12.5px] font-bold text-ink">{p.statusLabel}</span>
                </div>
                <p className="mt-1 text-[15px]">{p.rate ? <><b>{formatCents(p.rate.unitPriceCents)}</b><span className="text-ink-2">{p.rate.basis === "RATE" ? " per hour" : " fixed fee"}</span></> : <span className="text-ink-2">No rate given</span>}</p>
                <p className="mt-0.5 text-[12.5px] text-ink-2">{p.proposalNumber}{p.submittedAt && <> · sent {p.submittedAt.toISOString().slice(0, 10)}</>}{p.validUntil && <> · good until {p.validUntil.toISOString().slice(0, 10)}</>}</p>
                {p.coverNote && <p className="mt-1.5 whitespace-pre-wrap text-[14px] text-ink-2">{p.coverNote}</p>}
                <ProposalSteps workRequestId={detail.id} providerPersonId={p.providerPersonId} providerName={p.providerName} interviewStatus={p.interviewStatus} testStatus={p.testStatus} tests={sendableTests} />
                <SelectProposal workRequestId={detail.id} providerPersonId={p.providerPersonId} providerName={p.providerName} hasRate={p.rate !== null} selected={p.status === "AWARDED"} />
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {/* 6 Interviews */}
      <SectionCard id="interviews" title={`Interviews (${buyerInterviews.length})`}>
        {buyerInterviews.length ? <InterviewCards rows={buyerInterviews} side="buyer" videoReady={dailyConfigured()} /> : muted("No interviews yet.")}
        {sec.evalRows.length > 0 && (
          <ul className="mt-3 divide-y divide-line border-t border-line text-[13.5px]">
            {sec.evalRows.map((e, i) => <li key={i} className="py-2"><b>{e.who}</b>{e.rating != null && <span className="ml-2 text-magenta-dark">{"★".repeat(e.rating)}{"☆".repeat(5 - e.rating)}</span>}{e.summary && <p className="text-ink-2">{e.summary}</p>}</li>)}
          </ul>
        )}
      </SectionCard>

      {/* 7 Test requests */}
      <SectionCard title={`Test requests (${sec.testRows.length})`}>
        {sec.testRows.length ? (
          <ul className="divide-y divide-line text-[13.5px]">
            {sec.testRows.map((t) => <li key={t.number} className="flex flex-wrap justify-between gap-2 py-2"><span><b>{t.who}</b> · {t.skill}</span><span className="text-ink-2">{t.score != null ? `${t.score}% · ` : ""}<b className="text-ink">{t.result}</b></span></li>)}
          </ul>
        ) : muted("No test requests.")}
      </SectionCard>

      {/* 8 Award */}
      <SectionCard title="Award">
        {sec.awardRows.length ? (
          <ul className="divide-y divide-line text-[13.5px]">
            {sec.awardRows.map((a, i) => <li key={i} className="flex flex-wrap justify-between gap-2 py-2"><span><b>{a.who}</b>{a.wr ? <span className="font-mono text-ink-2"> · {a.wr}</span> : null}</span><span className="text-ink-2">{a.rate != null ? `${formatCents(a.rate)}${a.uom === "HOUR" ? "/hr" : ""} · ` : ""}{a.when}</span></li>)}
          </ul>
        ) : muted("Not awarded yet.")}
        {(detail.status === "DRAFT" || detail.status === "OPEN") && !awarded && options.length > 0 && <AssignDirectly workRequestId={detail.id} providers={options} />}
        {awarded && <CreateOrder workRequestId={detail.id} description={detail.workRequestDescription} />}
      </SectionCard>

      {/* 9 Lines */}
      <SectionCard title="Lines">
        <WorkRequestLines key={detail.status} initial={detail} />
      </SectionCard>

      {/* 10 Approval */}
      <SectionCard title="Approval">
        {sec.approval ? (
          <p className="text-[13.5px]">{sec.approval.wr && <span className="font-mono text-ink-2">{sec.approval.wr} · </span>}{sec.approval.at ? <><b>Auto-approved</b> · {sec.approval.at}</> : <>{WORK_REQUEST_STATUS_LABEL[detail.workRequestStatus]}</>}{sec.approval.note ? ` · ${sec.approval.note}` : ""}</p>
        ) : muted("Approval follows the Award (automatic in R1).")}
        {(await jobOrders(detail.id)).map((wo) => (
          <p key={wo.id} data-job-work-order className="mt-1.5 text-[13.5px] text-ink-2">Work Order: <Link href={`/orders/${wo.id}`} className="font-semibold text-ink underline underline-offset-2">{wo.order_number}</Link> · {wo.label}</p>
        ))}
      </SectionCard>

      {/* 11 Attachments & Notes */}
      <SectionCard title="Attachments & Notes">
        {detail.description || sec.notes.length ? (
          <div className="grid gap-2 text-[14px] text-ink-2">{[detail.description, ...sec.notes].filter((x, k, a): x is string => !!x && a.indexOf(x) === k).map((n, k) => <p key={k} className="whitespace-pre-wrap">{n}</p>)}</div>
        ) : muted("No attachments or notes.")}
      </SectionCard>

      {/* 12 Activity log */}
      <SectionCard title="Activity log" open={false}>
        <ol className="grid gap-1.5 text-[13px]">{sec.log.map((e, k) => <li key={k} className="flex gap-3"><span className="w-[120px] shrink-0 tabular-nums text-ink-3">{e.at}</span><span>{e.text}</span></li>)}</ol>
      </SectionCard>
    </div>
  );
}

function SectionCard({ id, title, right, open = true, children }: { id?: string; title: string; right?: React.ReactNode; open?: boolean; children: React.ReactNode }) {
  return <Card id={id} title={title} right={right} open={open}>{children}</Card>;
}

/** WA-E005: the Work Orders this Job's Work Requests produced, with their acceptance status. */
async function jobOrders(jobId: string) {
  const rows = await prisma.workOrder.findMany({ where: { workRequest: { job_id: jobId }, status: { not: "CANCELLED" } }, orderBy: { created_at: "desc" }, select: { id: true, order_number: true, status: true, buyer_accepted_at: true, provider_accepted_at: true } });
  return rows.map((r) => { const w = waitingOn(r); return { ...r, label: w ? PENDING_ON_LABEL[w] : WORK_ORDER_LABEL[r.status] }; });
}
