import Link from "next/link";
import { WorkRequestPath } from "@/components/work/WorkRequestPath";
import { Fact, GREEN, MUTED, ROW_RULE, Section, BTN_OUT } from "@/components/hire/HireUI";
import { ProposalActions } from "@/components/work/ProposalActions";
import { jobPath } from "@/lib/work-request-path";
import { certificationTestForSkill } from "@/lib/certification-tests";
import { HOW_LONG } from "@/lib/hire-questionnaire";
import { workRequestSections } from "@/lib/work-request-sections";
import { listInterviews } from "@/lib/interviews";
import { dailyConfigured } from "@/lib/daily";
import { InterviewCards } from "@/components/work/InterviewCards";
import { ActionsMenu } from "@/components/casing/ActionsMenu";
import { NeutralAvatar } from "@/components/Avatar";
import { identityVisibleTo, providerLabel, providerNumbers } from "@/lib/provider-number";
import { PENDING_ON_LABEL, WORK_ORDER_LABEL, waitingOn } from "@/lib/oracle-status";
import { notFound, redirect } from "next/navigation";
import { checkTransact, guardPage } from "@/lib/guard";
import { getSessionViewer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/display";
import { getWorkRequestDetail } from "@/lib/work-request-lines";
import { proposalsOn } from "@/lib/proposals";
import { AssignDirectly, CreateOrder } from "@/components/work/HireControls";
import { matchProvidersFor } from "@/lib/work-request-match";
import {
  JOB_STATUS_LABEL,
} from "@/lib/work-request-status";
import { WorkRequestError } from "@/lib/work-request";
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
  const actions = [
    ...(detail.status === "DRAFT" ? [{ label: "Edit the Job", href: `/hire?job=${detail.id}&step=0` }] : []),
    ...(sourcing ? [{ label: `Open Sourcing Event ${sourcing.event_number}`, href: `/hire/sourcing/${sourcing.id}` }] : []),
    ...(!detail.soleSourced ? [{ label: "Invite providers", href: `/work-requests/${id}/invite` }] : []),
    ...(posted ? [{ label: "Share with providers", href: `/work-requests/${id}/share` }] : []),
    ...sec.orders.map((o) => ({ label: `Open Work Order ${o.order_number}`, href: `/orders/${o.id}` })),
    { label: "My Jobs", href: "/hire/jobs" },
  ];

  // HL-E003: the page as Scott's approved mockup — header, one fact row, the progress band, then sections over an ink rule.
  const path = await jobPath(detail.id);
  const currentLabel = path?.shown.find((x) => x.key === path.current)?.label ?? JOB_STATUS_LABEL[detail.status];
  let testId: string | null = null;
  for (const sk of sdForMatches?.skills ?? []) { const t = await certificationTestForSkill(sk.id); if (t) { testId = t.assessmentId; break; } }
  const sd = sdForMatches;
  const usd = (c: number | null | undefined) => (c == null ? null : `$${(c / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}`);
  const per = sd?.budgetType === "FIXED" ? "" : "/hr";
  const rangeText = sd && (sd.budgetMin != null || sd.budgetMax != null) ? `${sd.budgetMin != null ? `$${sd.budgetMin}` : "…"}–${sd.budgetMax != null ? `$${sd.budgetMax}` : "…"}${per}` : null;
  const empty = (t: string) => <p className={MUTED}>{t}</p>;
  const eyebrow = [sec.jobNumber, sec.header.workRequest, sec.header.origin?.toUpperCase()].filter(Boolean).join(" · ");

  return (
    <div className="pm-white-page mx-auto flex w-full min-w-0 max-w-[1120px] flex-col gap-[22px] pb-16" data-work-request-page>
      <Link href="/hire/overview?tab=jobs" className="text-[13px] font-semibold">‹ Back to Jobs</Link>

      <section aria-label="Header" className="flex flex-col gap-[18px]" data-wr-header>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-[1_1_520px]">
            <div className="break-words text-[12px] font-bold tracking-[0.12em] text-magenta">{eyebrow || "JOB"}</div>
            <h1 className="mt-1.5 text-[24px] font-extrabold leading-tight sm:text-[30px]">{detail.title.trim() || "Untitled job"}</h1>
            {awarded && erpReturned && <p className="mt-1 text-[12.5px] text-[#5d5768]">Returned to ERP — waiting for the PO</p>}
          </div>
          <div className="flex items-center gap-2.5">
            <span className="rounded-[14px] bg-[#fbeafb] px-3 py-1.5 text-[12px] font-bold text-magenta-dark" data-status-pill>{currentLabel}</span>
            <ActionsMenu items={actions} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 border-y border-[#e7e5ec] py-3.5 sm:grid-cols-5" data-wr-facts>
          <Fact label="Created">{sec.header.created}</Fact>
          <Fact label="Buyer">{sec.header.buyer}</Fact>
          <Fact label="Provider">{sec.provider ?? <span className="text-[#8a8494]">Not awarded yet</span>}</Fact>
          <Fact label="Style">{sec.header.style ?? <span className="text-[#8a8494]">Set on Award</span>}</Fact>
          <Fact label="Work Request">{sec.header.workRequest ?? <span className="text-[#8a8494]">Created on Award</span>}</Fact>
        </div>
      </section>

      <WorkRequestPath jobId={detail.id} />

      <Section title="Job details" right={detail.status === "DRAFT" ? <Link href={`/hire?job=${detail.id}&step=0`}>Edit</Link> : null}>
        {sd ? (
          <div className="grid grid-cols-1 gap-x-6 gap-y-[18px] sm:grid-cols-3" data-job-facts>
            <Fact label="What"><span className="font-normal">{[sd.summary || sd.title, sd.category].filter(Boolean).join(" · ")}</span></Fact>
            <Fact label="Where"><span className="font-normal">{[sd.worksite ? sd.worksite[0] + sd.worksite.slice(1).toLowerCase() : null, [sd.city, sd.state].filter(Boolean).join(", ") || null].filter(Boolean).join(" · ") || "—"}</span></Fact>
            <Fact label="Type"><span className="font-normal">{sd.contractTypes.length ? `Contract · ${sd.contractTypes.join("/")}` : "—"}</span></Fact>
            <Fact label="Who"><span className="font-normal">{[sd.specificRole || null, sd.domains[0], sd.product || null, sd.years ? `${sd.years}+ years` : null, sd.skills.length ? `${sd.skills.length} skills` : null].filter(Boolean).join(" · ") || "—"}</span></Fact>
            <Fact label="When"><span className="font-normal">{[sd.duration ? HOW_LONG.find((h) => h.value === sd.duration)?.label : null, sd.startText || (sd.startDate ? `start ${sd.startDate}` : null)].filter(Boolean).join(" · ") || "—"}</span></Fact>
            <Fact label="Rate"><span className="font-normal">{rangeText ?? "—"}</span></Fact>
          </div>
        ) : empty("The Service Description shows here once the job has one.")}
      </Section>

      {detail.status === "DRAFT" && (
        <div className="flex flex-wrap items-center gap-3 border border-[#e7e5ec] p-4">
          <p className="min-w-0 flex-1 text-[14px]"><b>This Job is still a draft.</b> <span className="text-[#5d5768]">Posting makes it visible to providers.</span></p>
          <Link href="/hire" className={BTN_OUT}>Open in Hire</Link>
        </div>
      )}

      {(detail.status === "DRAFT" || detail.status === "OPEN") && !awarded && jobMatches.length > 0 && (
        <Section id="matches" title="Matches" extra={sourcing ? <>· <Link href={`/hire/sourcing/${sourcing.id}`}>{sourcing.event_number}</Link></> : null}>
          <MatchList jobId={detail.id} matches={jobMatches} state={sdForMatches?.state} />
        </Section>
      )}

      <Section title="Requests to Propose" extra={sec.requestRows.length ? `· ${sec.requestRows.length} asked · ${sec.responded} responded` : null} right={!awarded && (detail.status === "OPEN" || detail.status === "DRAFT") ? <Link href={`/work-requests/${detail.id}#matches`}>Request more</Link> : null}>
        {sec.requestRows.length ? sec.requestRows.map((r) => (
          <div key={r.number} className={`flex flex-wrap items-center gap-3.5 py-3 text-[14px] ${ROW_RULE}`}>
            <span className="w-[70px] font-bold">{r.who.replace(/^Provider /, "")}</span>
            <span className="min-w-0 flex-[1_1_200px] text-[#5d5768]">Asked {r.asked}{r.due ? ` · due ${r.due}` : ""}</span>
            <span className={`font-bold ${r.status === "Responded" ? GREEN : r.status.startsWith("Declined") ? "text-[#d92d20]" : "text-[#5d5768]"}`}>{r.status}</span>
          </div>
        )) : empty("No requests yet. Star providers in Matches and request proposals from your shortlist.")}
      </Section>

      <Section title="Proposals" right={sourcing ? <Link href={`/hire/sourcing/${sourcing.id}`}>Compare</Link> : null}>
        {proposals.length ? proposals.map((p) => {
          const x = sec.proposalExtra(p.providerPersonId);
          return (
            <div key={p.id} className={`flex flex-wrap items-center gap-3.5 py-3.5 ${ROW_RULE}`} data-proposal-row>
              <NeutralAvatar size={36} />
              <div className="min-w-0 flex-[1_1_260px]">
                <div className="text-[15px] font-bold">{[p.providerName.replace(/^Provider /, ""), p.rate ? `${formatCents(p.rate.unitPriceCents)}${p.rate.basis === "RATE" ? "/hr" : " fixed"}` : "no rate", x.start ? `start ${x.start}` : null].filter(Boolean).join(" · ")}</div>
                <div className="mt-0.5 text-[13px] text-[#5d5768]">{[x.summary || null, p.coverNote ? `“${p.coverNote.slice(0, 120)}”` : "no note"].filter(Boolean).join(" · ")}</div>
              </div>
              <ProposalActions jobId={detail.id} providerPersonId={p.providerPersonId} testId={testId} awarded={p.status === "AWARDED"} interviewStatus={p.interviewStatus} testStatus={p.testStatus} />
            </div>
          );
        }) : empty(posted ? "No proposals yet. They show here as providers respond." : "No proposals yet — a Job takes proposals once it is posted.")}
      </Section>

      <Section id="interviews" title="Interviews">
        {buyerInterviews.length ? <InterviewCards rows={buyerInterviews} side="buyer" videoReady={dailyConfigured()} /> : empty("None scheduled. Use Interview on a proposal; ranking and comments land here.")}
        {sec.evalRows.length > 0 && (
          <div className="mt-3">
            {sec.evalRows.map((e, k) => <div key={k} className={`py-2 text-[14px] ${ROW_RULE}`}><b>{e.who}</b>{e.rating != null && <span className="ml-2 text-magenta-dark">{"★".repeat(e.rating)}{"☆".repeat(5 - e.rating)}</span>}{e.summary && <p className="text-[#5d5768]">{e.summary}</p>}</div>)}
          </div>
        )}
      </Section>

      <Section title="Test requests">
        {sec.testRows.length ? sec.testRows.map((t) => (
          <div key={t.number} className={`flex flex-wrap justify-between gap-2 py-2.5 text-[14px] ${ROW_RULE}`}><span><b>{t.who.replace(/^Provider /, "")}</b> · {t.skill}</span><span className="text-[#5d5768]">{t.score != null ? `${t.score}% · ` : ""}<b className={t.result === "Pass" ? GREEN : t.result === "Fail" ? "text-[#d92d20]" : "text-ink"}>{t.result}</b></span></div>
        )) : empty("None requested. Scores and pass/fail show here.")}
      </Section>

      <Section title="Award">
        {sec.awardRows.length ? sec.awardRows.map((a, k) => (
          <div key={k} className={`flex flex-wrap justify-between gap-2 py-2.5 text-[14px] ${ROW_RULE}`}><span><b>{a.who.replace(/^Provider /, "")}</b>{a.wr ? <span className="text-[#5d5768]"> · {a.wr}</span> : null}</span><span className="text-[#5d5768]">{a.rate != null ? `${formatCents(a.rate)}${a.uom === "HOUR" ? "/hr" : ""} · ` : ""}{a.when}</span></div>
        )) : empty("Not awarded yet. Awarding a proposal creates the Work Request.")}
        {(detail.status === "DRAFT" || detail.status === "OPEN") && !awarded && options.length > 0 && <AssignDirectly workRequestId={detail.id} providers={options} />}
        {awarded && <CreateOrder workRequestId={detail.id} description={detail.workRequestDescription} />}
      </Section>

      <Section title="Lines">
        {sec.lineRows.length ? (
          <div className="overflow-x-auto">
            <div className="grid min-w-[760px] grid-cols-[40px_2fr_1.2fr_0.8fr_0.8fr_1fr_1.2fr] gap-3 border-b border-[#e7e5ec] py-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#5d5768]">
              <span>#</span><span>Description</span><span>Line type</span><span>Qty</span><span>Rate</span><span>Amount</span><span>Payment Event</span>
            </div>
            {sec.lineRows.map((l) => (
              <div key={l.n} className={`grid min-w-[760px] grid-cols-[40px_2fr_1.2fr_0.8fr_0.8fr_1fr_1.2fr] gap-3 py-3 text-[14px] ${ROW_RULE}`}>
                <span>{l.n}</span><span className="min-w-0 break-words">{l.description || "—"}</span><span>{l.type}</span><span>{l.qty != null ? `${l.qty}${l.uom ? ` ${l.uom.toLowerCase()}` : ""}` : "—"}</span><span>{usd(l.rate) ?? "—"}</span><span>{usd(l.amount) ?? "—"}</span><span>{l.event ?? "—"}</span>
              </div>
            ))}
          </div>
        ) : empty("Lines are filled on Award: the role, quantity, rate and Payment Event that carry to the Work Order.")}
      </Section>

      <Section title="Approval">
        {sec.approval?.at ? <p className="text-[14px]"><b>Auto-approved</b> · {sec.approval.at}{sec.approval.wr ? ` · ${sec.approval.wr}` : ""}</p> : empty("Auto-approved after Award (R1).")}
        {(await jobOrders(detail.id)).map((wo) => (
          <p key={wo.id} data-job-work-order className="mt-1.5 text-[14px] text-[#5d5768]">Work Order: <Link href={`/orders/${wo.id}`} className="font-semibold">{wo.order_number}</Link> · {wo.label}</p>
        ))}
      </Section>

      <Section title="Attachments & Notes">
        {sec.attachments.length || detail.description || sec.notes.length ? (
          <div className="grid gap-2 text-[14px] text-[#5d5768]">
            {sec.attachments.map((a) => <p key={a.name}>{a.name} · uploaded {a.at}</p>)}
            {[detail.description, ...sec.notes].filter((x, k, arr): x is string => !!x && arr.indexOf(x) === k).map((n, k) => <p key={k} className="whitespace-pre-wrap">{n}</p>)}
          </div>
        ) : empty("No attachments or notes. Files you upload with the posting show here.")}
      </Section>

      <Section title="Activity">
        <div className="flex flex-col text-[13px]">
          {sec.log.map((e, k) => <div key={k} className={`flex gap-4 py-2 ${ROW_RULE}`}><span className="w-[130px] shrink-0 text-[#5d5768]">{e.at}</span><span className="min-w-0">{e.text}</span></div>)}
        </div>
      </Section>
    </div>
  );
}


/** WA-E005: the Work Orders this Job's Work Requests produced, with their acceptance status. */
async function jobOrders(jobId: string) {
  const rows = await prisma.workOrder.findMany({ where: { workRequest: { job_id: jobId }, status: { not: "CANCELLED" } }, orderBy: { created_at: "desc" }, select: { id: true, order_number: true, status: true, buyer_accepted_at: true, provider_accepted_at: true } });
  return rows.map((r) => { const w = waitingOn(r); return { ...r, label: w ? PENDING_ON_LABEL[w] : WORK_ORDER_LABEL[r.status] }; });
}
