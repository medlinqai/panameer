import { LiveRefresh } from "@/components/LiveRefresh";
import Link from "next/link";
import { howLongText } from "@/lib/job-dates";
import { JobStrip, JobTabs } from "@/components/hire/JobFrame";
import { jobStrip, type JobTab } from "@/lib/job-strip";
import { JOB_STAGE_LABEL, JOB_STAGE_STATE, jobStages } from "@/lib/job-stage";
import { REQUEST_STATUS_LABEL, requestStatus } from "@/lib/request-status";
import { erpWaitDay } from "@/lib/request-approval";
import { RequestApproval } from "@/components/hire/RequestApproval";
import { Fact, GREEN, MUTED, ROW_RULE, Section, BTN_OUT, StatePill } from "@/components/hire/HireUI";
import { ProposalActions } from "@/components/work/ProposalActions";
import { certificationTestForSkill } from "@/lib/certification-tests";
import { HOW_LONG } from "@/lib/hire-questionnaire";
import { workRequestSections } from "@/lib/work-request-sections";
import { listInterviews } from "@/lib/interviews";
import { dailyConfigured } from "@/lib/daily";
import { InterviewCards } from "@/components/work/InterviewCards";
import { JobActionsMenu, type JobMenuItem } from "@/components/hire/JobActionsMenu";
import { AmendJob } from "@/components/hire/AmendJob";
import type { JobStage } from "@/lib/job-stage";
import { NeutralAvatar } from "@/components/Avatar";
import { providerPhotos } from "@/lib/provider-number";
import { PENDING_ON_LABEL, WORK_ORDER_LABEL, waitingOn } from "@/lib/oracle-status";
import { notFound, redirect } from "next/navigation";
import { checkTransact, guardPage } from "@/lib/guard";
import { getSessionViewer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/display";
import { getWorkRequestDetail } from "@/lib/work-request-lines";
import { proposalsOn } from "@/lib/proposals";
import { CreateOrder } from "@/components/work/HireControls";
import { WorkRequestError } from "@/lib/work-request";
import { MatchList } from "@/components/hire/MatchList";
import { hireMatches } from "@/lib/hire-questionnaire";
import { readServiceDescription } from "@/lib/service-description";
import { eventForBuyer, latestEventFor } from "@/lib/sourcing-events";
import { SourcingEventView } from "@/components/hire/SourcingEventView";
import { OpenTimes } from "@/components/hire/OpenTimes";
import { myOpenTimes } from "@/lib/open-times";
import { seesTestAccounts } from "@/lib/admin/test-accounts";

export const metadata = { title: "Job · Panameer" };
const fmtDay = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; amend?: string; po?: string }>;
}) {
  const sp = await searchParams;
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

  const proposals = await proposalsOn(viewer, id);

  // SE-E002: the Job's Matches use the Hire ranking on its Service Description.
  const sdForMatches = await readServiceDescription(detail.id);
  const jobMatches = sdForMatches ? await hireMatches(sdForMatches, await seesTestAccounts(viewer), detail.id, viewer) : [];
  const sourcing = await latestEventFor(detail.id);
  const posted = detail.status === "OPEN";
  // Every line has a provider and a price, and the requisition isn't ordered yet → Create Order.
  const awarded = detail.completeness.complete && !["ORDERED", "CANCELLED"].includes(detail.workRequestStatus) && detail.status !== "FILLED";

  const sec = await workRequestSections(viewer, detail.id);
  const event = sourcing ? await eventForBuyer(viewer, sourcing.id).catch(() => null) : null;
  const inEvent = new Set(event?.proposals.map((p) => p.personId) ?? []);
  const shownProps = proposals.filter((p) => !inEvent.has(p.providerPersonId));
  const photos = await providerPhotos(proposals.map((p) => p.providerPersonId));
  // CA-E004: providers who answered Not This Time (reason shown).
  const notNow = sec.requestRows.filter((r) => r.status.startsWith("Not This Time")).map((r) => ({ who: r.who, number: r.number, reason: /“(.*)”/.exec(r.status)?.[1] ?? null }));
  const orders = await jobOrders(detail.id);
  const buyerPersonId = (await prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { id: true } }))?.id ?? "";
  const buyerInterviews = await listInterviews({ jobId: detail.id, buyerPersonId });

  // HL-E003: the page as Scott's approved mockup — header, one fact row, the progress band, then sections over an ink rule.
  let testId: string | null = null;
  for (const sk of sdForMatches?.skills ?? []) { const t = await certificationTestForSkill(sk.id); if (t) { testId = t.assessmentId; break; } }
  const sd = sdForMatches;
  const usd = (c: number | null | undefined) => (c == null ? null : `$${(c / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}`);
  const per = sd?.budgetType === "FIXED" ? "" : "/hr";
  const rangeText = sd && (sd.budgetMin != null || sd.budgetMax != null) ? `${sd.budgetMin != null ? `$${sd.budgetMin}` : "…"}–${sd.budgetMax != null ? `$${sd.budgetMax}` : "…"}${per}` : null;
  const empty = (t: string) => <p className={MUTED}>{t}</p>;
  // HB-E002: one magenta button per screen — Award on the top-ranked open proposal (lowest rate), the others ink outline.
  const ranked = proposals.filter((p) => p.status !== "AWARDED" && p.status !== "DECLINED" && p.rate).sort((a, b) => a.rate!.unitPriceCents - b.rate!.unitPriceCents);
  const topProposalId = ranked[0]?.id ?? null;

  // OJ-E001: one frame for the whole hire — header, the 8-step strip, tabs (?tab=); the default tab follows the current step.
  const strip = await jobStrip(detail.id);
  // Scott 10-23: until a door is chosen (2. Choose Provider), the Job shows the doors and top matches only — no tabs.
  const doorChosen = strip?.steps.find((x) => x.key === "matches")?.state === "done";
  const tab: JobTab = !doorChosen ? "matches" : (["matches", "responses", "questions", "interviews", "tests", "work-order", "details"] as const).find((t) => t === sp.tab) ?? strip?.defaultTab ?? "matches";
  const meta = [sec.jobNumber, sd?.worksite ? sd.worksite[0] + sd.worksite.slice(1).toLowerCase() : null, sd ? [sd.city, sd.state].filter(Boolean).join(", ") || null : null, rangeText, sd?.startDate && sd?.endDate ? `${fmtDay(sd.startDate)} – ${fmtDay(sd.endDate)}` : null].filter(Boolean).join(" · ");
  // JS-E001: one buyer-facing status and the origin tag (From ERP · Compare Providers · Hire Directly).
  const stageInfo = (await jobStages([detail.id])).get(detail.id);
  const stage = stageInfo?.stage ?? "ACTIVE";
  const rq = await prisma.workRequest.findFirst({ where: { job_id: detail.id, OR: [{ lines: { some: { provider_person_id: { not: null } } } }, { erp_returned_at: { not: null } }] }, orderBy: { created_at: "desc" }, select: { id: true, status: true, erp_connection_id: true, erp_returned_at: true, approval_status: true, approval_channel: true, declined_reason: true, erp_wait_started_at: true, erp_wait_reset_at: true, submitted_at: true } });
  const origin = stageInfo?.origin ?? (strip?.event ? "Compare Providers" : strip?.direct ? "Hire Directly" : null);
  // Scott 10-23: step 4, Ask Questions — the sets sent on this job and who has answered.
  const qSets = await prisma.questionSet.findMany({ where: { job_id: detail.id }, orderBy: { created_at: "desc" }, select: { id: true, questions: true, due_at: true, created_at: true, answers: { select: { provider_person_id: true, submitted_at: true } } } });
  const qNums = new Map((await prisma.providerProfile.findMany({ where: { person_id: { in: [...new Set(qSets.flatMap((q) => q.answers.map((a) => a.provider_person_id)))] } }, select: { person_id: true, provider_number: true } })).map((x) => [x.person_id, x.provider_number ?? "Provider"]));
  const counts = { questions: qSets.reduce((n, q) => n + q.answers.length, 0), matches: jobMatches.length, responses: (event ? event.proposals.filter((p) => p.proposal || p.requestStatus === "DECLINED").length : notNow.length) + shownProps.length, interviews: buyerInterviews.length, tests: sec.testRows.length };

  return (
    <div className="pm-white-page mx-auto flex w-full min-w-0 max-w-[1120px] flex-col gap-[18px] pb-16" data-work-request-page>
      {/* Only while answers can still arrive. */}
      {stage === "COMPARING" && <LiveRefresh />}
      <Link href="/hire/overview?tab=jobs" className="text-[13px] font-semibold">‹ Jobs</Link>

      <section aria-label="Header" className="flex flex-wrap items-start justify-between gap-4" data-wr-header>
        <div className="min-w-0 flex-[1_1_520px]">
          <h1 className="text-[24px] font-extrabold leading-tight sm:text-[28px]">{detail.title.trim() || "Untitled job"}</h1>
          <p className="mt-1 text-[13px] text-state-inactive" data-job-meta>
            {meta}{origin && <> · <b className="font-semibold text-ink">{origin}</b></>}{origin === "Compare Providers" && sourcing && <> · {sourcing.event_number}</>}{posted && <> · <span data-visibility>{`On Job Board${detail.postedAt ? ` since ${new Date(detail.postedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}`}</span></>}
          </p>
          {awarded && erpReturned && <p className="mt-1 text-[12.5px] text-state-inactive">Returned to ERP — waiting for the PO</p>}
        </div>
        <div className="flex items-center gap-2.5">
          <StatePill state={JOB_STAGE_STATE[stage]}>{JOB_STAGE_LABEL[stage]}</StatePill>
          {stage === "REQUEST_TO_HIRE" && strip?.path.wrs[0]?.wr_number && <Link href={`/work-requests/${detail.id}?tab=work-order`} className="text-[13px] font-semibold" data-request-link>{strip.path.wrs[0].wr_number}</Link>}
          <JobActionsMenu jobId={detail.id} items={menuFor(stage, detail.id, sec.orders[0]?.id ?? null)} />
        </div>
      </section>

      {strip && (
        <div className="my-4 rounded-[14px] border border-state-border bg-white px-6 py-6">
          <JobStrip steps={strip.steps} jobId={detail.id} title="Job Timeline" />
          {/* Scott 10-23: after Hire the Job hands over — the Request and the Order carry their own steps. */}
          {strip.path.wrs[0] && strip.steps.find((x) => x.key === "hire")?.state === "done" && (
            <p className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-state-border pt-4 text-[13.5px]" data-handover>
              <span className="font-semibold text-state-inactive">Then:</span>
              <Link href={`/work-requests/${detail.id}?tab=work-order`} className="font-semibold">Request {strip.path.wrs[0].wr_number}</Link>
              {(() => { const rs = requestStatus(strip.path.wrs[0]); return <span className={rs === "APPROVED" ? "text-state-accepted" : rs === "DECLINED" ? "text-state-declined" : "text-state-pending"}>{rs ? REQUEST_STATUS_LABEL[rs] : "Pending Approval"}</span>; })()}
              {strip.wo && <>
                <span aria-hidden className="text-state-inactive">→</span>
                <Link href={`/orders/${strip.wo.id}`} className="font-semibold">Order {strip.wo.order_number}</Link>
                <span className={strip.released ? "text-state-accepted" : "text-state-pending"}>{strip.released ? "Released" : strip.accepted ? "Accepted — Ready to Release" : !strip.wo.buyer_accepted_at ? "Waiting on You" : "Waiting on Provider"}</span>
              </>}
            </p>
          )}
        </div>
      )}
      {doorChosen && <JobTabs jobId={detail.id} current={tab} counts={counts} />}

      {tab === "matches" && (
        <>
        {/* OJ-E002: the two doors and the matches; a row's rate is the rate they answered once they have. */}
        {jobMatches.length ? <MatchList jobId={detail.id} matches={answeredRates(jobMatches, proposals)} state={sdForMatches?.state} chosen={doorChosen} /> : empty("No matches yet. Matches show once the job has a Service Description.")}
        </>
      )}
      {tab === "responses" && (
        <>
          {/* OJ-E003: responses live here, once — the Compare Providers round, then anyone who applied to the posting. */}
          {event && <SourcingEventView ev={event} />}
          {(!event || shownProps.length > 0) && (
          <Section title={event ? "Applications" : "Responses"}>
            {shownProps.length || (!event && notNow.length) ? [...shownProps].sort((a, b) => Number(a.status === "DECLINED") - Number(b.status === "DECLINED") || (a.rate?.unitPriceCents ?? Infinity) - (b.rate?.unitPriceCents ?? Infinity)).map((p) => {
              const primary = p.id === topProposalId;
              const x = sec.proposalExtra(p.providerPersonId);
              return (
                <div key={p.id} className={`flex flex-wrap items-center gap-3.5 py-3.5 ${ROW_RULE}`} data-proposal-row>
                  <NeutralAvatar size={36} photoUrl={photos.get(p.providerPersonId)} />
                  <div className="min-w-0 flex-[1_1_260px]">
                    <div className="text-[15px] font-bold" data-response-line>{p.providerName.replace(/^Provider /, "")} · {p.status === "DECLINED" ? <span className="text-state-declined">Declined</span> : <span className="text-state-accepted">Available</span>} · {p.rate ? `${formatCents(p.rate.unitPriceCents)}${p.rate.basis === "RATE" ? "/hr" : " fixed"}` : "no rate"}{x.start ? ` · start ${x.start}` : ""}</div>
                    <div className="mt-0.5 text-[13px] text-state-inactive">{[x.summary || null, p.coverNote ? `“${p.coverNote.slice(0, 120)}”` : "no note"].filter(Boolean).join(" · ")}</div>
                  </div>
                  <ProposalActions jobId={detail.id} providerPersonId={p.providerPersonId} testId={testId} awarded={p.status === "AWARDED"} interviewStatus={p.interviewStatus} testStatus={p.testStatus} primary={primary} proposalId={p.id} status={p.status} />
                </div>
              );
            }).concat((event ? [] : notNow).map((r) => (
              <div key={`n-${r.number}`} className={`flex flex-wrap items-center gap-3.5 py-3.5 ${ROW_RULE}`} data-not-this-time-row>
                <NeutralAvatar size={36} />
                <div className="min-w-0 flex-1 text-[15px] font-bold">{r.who.replace(/^Provider /, "")} · <span className="text-state-declined">Not This Time</span>{r.reason && <span className="font-normal text-state-inactive"> · “{r.reason}”</span>}</div>
              </div>
            ))) : empty(posted ? "No responses yet. They show here as providers answer." : "No responses yet — a Job takes responses once it is posted.")}
          </Section>
          )}
        </>
      )}
      {tab === "interviews" && (
        <>
          {/* OJ-E004: this job's interviews; the buyer's Open Times (one calendar for every job) sit on top. */}
          <Section title="Set Interview Times"><OpenTimes windows={await myOpenTimes(buyerPersonId)} /></Section>
        <Section id="interviews" title="Interviews">
          {buyerInterviews.length ? <InterviewCards rows={buyerInterviews} side="buyer" videoReady={dailyConfigured()} /> : empty("None scheduled. Use Interview on a response; ranking and comments land here.")}
          {sec.evalRows.length > 0 && (
            <div className="mt-3">
              {sec.evalRows.map((e, k) => <div key={k} className={`py-2 text-[14px] ${ROW_RULE}`}><b>{e.who}</b>{e.rating != null && <span className="ml-2 text-magenta-dark">{"★".repeat(e.rating)}{"☆".repeat(5 - e.rating)}</span>}{e.summary && <p className="text-state-inactive">{e.summary}</p>}</div>)}
            </div>
          )}
        </Section>
        </>
      )}
      {tab === "questions" && (
        <section className="mt-5 flex flex-col gap-4" data-questions-tab>
          <p className="text-[13.5px] text-state-inactive"><b className="text-ink">Next:</b> {qSets.length ? "Read the answers on Request Availability (Read Answers on each row), or ask more." : "Optional. Send written questions to the providers who are available — quick answers often replace an interview."} <Link href={`/work-requests/${detail.id}?tab=responses`} className="font-semibold">Ask Questions on Request Availability →</Link></p>
          {qSets.map((q) => {
            const n = Array.isArray(q.questions) ? q.questions.length : 0;
            const inN = q.answers.filter((a) => a.submitted_at).length;
            return (
              <div key={q.id} className="rounded-[12px] border border-state-border p-5">
                <p className="text-[14.5px] font-bold">{n} Question{n === 1 ? "" : "s"} · sent {q.created_at.toLocaleDateString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric" })}{q.due_at ? ` · answer by ${q.due_at.toLocaleDateString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric" })}` : ""} · <span className={inN === q.answers.length ? "text-state-accepted" : "text-state-pending"}>{inN} of {q.answers.length} Answered</span></p>
                <ul className="mt-3 flex flex-wrap gap-2 text-[13px]">
                  {q.answers.map((a) => <li key={a.provider_person_id} className={`rounded-full px-3 py-1 font-semibold ${a.submitted_at ? "bg-state-accepted-bg text-state-accepted" : "bg-state-pending-bg text-state-pending"}`}>{qNums.get(a.provider_person_id)} · {a.submitted_at ? "Answered" : "Waiting"}</li>)}
                </ul>
              </div>
            );
          })}
        </section>
      )}
      {(tab === "interviews" || tab === "tests") && (
        <>
        <Section title="Tests">
          {sec.testRows.length ? sec.testRows.map((t) => (
            <div key={t.number} className={`flex flex-wrap justify-between gap-2 py-2.5 text-[14px] ${ROW_RULE}`}><span><b>{t.who.replace(/^Provider /, "")}</b> · {t.skill}</span><span className="text-state-inactive">{t.score != null ? `${t.score}% · ` : ""}<b className={t.result === "Pass" ? GREEN : t.result === "Fail" ? "text-state-declined" : "text-ink"}>{t.result}</b></span></div>
          )) : empty("None requested. Scores and pass/fail show here.")}
        </Section>
        </>
      )}
      {tab === "work-order" && (
        <>
          {/* OJ-E005: before Hire, a pointer; after, the Service Requisition and the Work Order cards with their buttons. */}
          {stage === "REQUEST_TO_HIRE" && origin === "From ERP" && !orders.length && (
            <p className="rounded-[12px] bg-state-pending-bg px-4 py-3 text-[14px] font-semibold text-state-pending" data-in-erp-cart>Request to Hire — waiting on your ERP. The Order arrives with the ERP&apos;s purchase order.</p>
          )}
          {!sec.awardRows.length && !orders.length ? (
            <div className="rounded-[12px] border border-state-border p-5" data-work-order-empty>
              <p className="text-[15px] font-bold">No one is hired yet.</p>
              <p className="mt-1 text-[14px] text-state-inactive">Pick a provider on <Link href={`/work-requests/${detail.id}?tab=responses`}>Responses</Link> (or <Link href={`/work-requests/${detail.id}?tab=matches`}>Matches</Link>) and press Request to Hire.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <section className="rounded-[12px] border border-state-border p-5" data-requisition-card>
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-state-inactive">Request</p>
                <h2 className="mt-1 text-[18px] font-extrabold">{sec.header.workRequest ?? "Created on Request to Hire"}</h2>
                {sec.jobNumber && <p className="mt-0.5 text-[13px] text-state-inactive" data-for-job>For Job <Link href={`/work-requests/${detail.id}`} className="font-semibold text-ink">{sec.jobNumber}</Link></p>}
                {sec.awardRows.map((a, k) => <p key={k} className="mt-2 text-[14px]"><b>{a.who.replace(/^Provider /, "")}</b><span className="text-state-inactive"> · {a.rate != null ? `${formatCents(a.rate)}${a.uom === "HOUR" ? "/hr" : ""} · ` : ""}{a.when}</span></p>)}
                {(() => {
                  const rs = rq ? requestStatus(rq) : null;
                  return <>
                    <p className="mt-2 text-[14px]" data-request-status>Status: {rs ? <b className={rs === "APPROVED" ? "text-state-accepted" : rs === "DECLINED" ? "text-state-declined" : "text-state-pending"}>{REQUEST_STATUS_LABEL[rs]}</b> : <span className="text-state-inactive">Not Requested Yet</span>}{rs === "APPROVED" && sec.approval?.at ? <span className="text-state-inactive"> · {sec.approval.at}</span> : null}</p>
                    {rs === "DECLINED" && rq?.declined_reason && <p className="mt-1 text-[13px] text-state-inactive">{rq.declined_reason}</p>}
                    {rs === "WAITING_ERP" && rq && <RequestApproval id={rq.id} day={erpWaitDay(rq)} canReset={!rq.erp_wait_reset_at} focus={sp.po} />}
                  </>;
                })()}
                {awarded && <div className="mt-3"><CreateOrder workRequestId={detail.id} description={detail.workRequestDescription} /></div>}
              </section>
              {orders.map((wo) => (
                <section key={wo.id} className="rounded-[12px] border border-state-border p-5" data-job-work-order>
                  <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-state-inactive">Order</p>
                  <h2 className="mt-1 text-[18px] font-extrabold">{wo.order_number}</h2>
                  <p className="mt-2 text-[14px]">{[sec.header.style, wo.label].filter(Boolean).join(" · ")}</p>
                  <p className="mt-1 text-[13.5px]"><span className={wo.buyer_accepted_at ? "text-state-accepted" : "text-state-pending"}>{wo.buyer_accepted_at ? "✓ You Accepted" : "Your Acceptance Pending"}</span> · <span className={wo.provider_accepted_at ? "text-state-accepted" : "text-state-pending"}>{wo.provider_accepted_at ? "✓ Provider Accepted" : "Provider Acceptance Pending"}</span></p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link href={`/orders/${wo.id}`} className={BTN_OUT}>{wo.buyer_accepted_at ? "Open Order" : "Review & Accept"}</Link>
                    <Link href="/orders/overview" className="self-center text-[13px] font-semibold">Orders →</Link>
                  </div>
                </section>
              ))}
            </div>
          )}
        <Section title="Lines">
          {sec.lineRows.length ? (
            <div className="overflow-x-auto">
              <div className="grid min-w-[760px] grid-cols-[40px_2fr_1.2fr_0.8fr_0.8fr_1fr_1.2fr] gap-3 border-b border-state-border py-2 text-[11px] font-bold uppercase tracking-[0.08em] text-state-inactive">
                <span>#</span><span>Description</span><span>Line type</span><span>Qty</span><span>Rate</span><span>Amount</span><span>Payment Event</span>
              </div>
              {sec.lineRows.map((l) => (
                <div key={l.n} className={`grid min-w-[760px] grid-cols-[40px_2fr_1.2fr_0.8fr_0.8fr_1fr_1.2fr] gap-3 py-3 text-[14px] ${ROW_RULE}`}>
                  <span>{l.n}</span><span className="min-w-0 break-words">{l.description || "—"}</span><span>{l.type}</span><span>{l.qty != null ? `${l.qty}${l.uom ? ` ${l.uom.toLowerCase()}` : ""}` : "—"}</span><span>{usd(l.rate) ?? "—"}</span><span>{usd(l.amount) ?? "—"}</span><span>{l.event ?? "—"}</span>
                </div>
              ))}
            </div>
          ) : empty("Lines are filled on Award: the role, quantity, rate and Payment Event that carry to the Order.")}
        </Section>
        </>
      )}
      {tab === "details" && (
        <>
          {/* JS-E005: Edit while Comparing is an Amendment. */}
          {sp.amend === "1" && stage === "COMPARING" && sd && (
            <AmendJob jobId={detail.id} asked={event?.proposals.length ?? 0} initial={{ title: sd.title, summary: sd.summary, budgetMin: sd.budgetMin != null ? String(sd.budgetMin) : "", budgetMax: sd.budgetMax != null ? String(sd.budgetMax) : "", startDate: sd.startDate, endDate: sd.endDate, worksite: sd.worksite ?? "OFFSITE", city: sd.city, state: sd.state, required: sd.required, niceToHave: sd.niceToHave }} />
          )}
        <Section title="Job Details" right={detail.status === "DRAFT" ? <Link href={`/hire?job=${detail.id}&step=0`}>Edit</Link> : null}>
          {sd ? (
            <div className="grid grid-cols-1 gap-x-6 gap-y-[18px] sm:grid-cols-3" data-job-facts>
              <Fact label="What"><span className="font-normal">{[sd.summary || sd.title, sd.category].filter(Boolean).join(" · ")}</span></Fact>
              <Fact label="Where"><span className="font-normal">{[sd.worksite ? sd.worksite[0] + sd.worksite.slice(1).toLowerCase() : null, [sd.city, sd.state].filter(Boolean).join(", ") || null].filter(Boolean).join(" · ") || "—"}</span></Fact>
              <Fact label="Type"><span className="font-normal">{sd.contractTypes.length ? `Contract · ${sd.contractTypes.join("/")}` : "—"}</span></Fact>
              <Fact label="Who"><span className="font-normal">{[sd.specificRole || null, sd.domains[0], sd.product || null, sd.years ? `${sd.years}+ years` : null, sd.skills.length ? `${sd.skills.length} skills` : null].filter(Boolean).join(" · ") || "—"}</span></Fact>
              <Fact label="When"><span className="font-normal">{sd.startDate && sd.endDate ? `${sd.startDate} – ${sd.endDate} · ${howLongText(sd.startDate, sd.endDate)}` : [sd.duration ? HOW_LONG.find((h) => h.value === sd.duration)?.label : null, sd.startText || (sd.startDate ? `start ${sd.startDate}` : null)].filter(Boolean).join(" · ") || "—"}</span></Fact>
              <Fact label="Rate"><span className="font-normal">{rangeText ?? "—"}</span></Fact>
            </div>
          ) : empty("The Service Description shows here once the job has one.")}
        </Section>
        <Section title="Availability Requests" extra={sec.requestRows.length ? `· ${sec.requestRows.length} asked · ${sec.responded} responded` : null} right={!awarded && (detail.status === "OPEN" || detail.status === "DRAFT") ? <Link href={`/work-requests/${detail.id}?tab=matches`}>Request More</Link> : null}>
          {sec.requestRows.length ? sec.requestRows.map((r) => (
            <div key={r.number} className={`flex flex-wrap items-center gap-3.5 py-3 text-[14px] ${ROW_RULE}`}>
              <span className="w-[70px] font-bold">{r.who.replace(/^Provider /, "")}</span>
              <span className="min-w-0 flex-[1_1_200px] text-state-inactive">Asked {r.asked}{r.due ? ` · due ${r.due}` : ""}</span>
              <span className={`font-bold ${r.status === "Responded" ? GREEN : r.status.startsWith("Not This Time") ? "text-state-declined" : "text-state-inactive"}`}>{r.status}</span>
            </div>
          )) : empty("No requests yet. Star providers in Matches and request their availability.")}
        </Section>
        <Section title="Attachments & Notes">
          {sec.attachments.length || detail.description || sec.notes.length ? (
            <div className="grid gap-2 text-[14px] text-state-inactive">
              {sec.attachments.map((a) => <p key={a.name}>{a.name} · uploaded {a.at}</p>)}
              {[detail.description, ...sec.notes].filter((x, k, arr): x is string => !!x && arr.indexOf(x) === k).map((n, k) => <p key={k} className="whitespace-pre-wrap">{n}</p>)}
            </div>
          ) : empty("No attachments or notes. Files you upload with the posting show here.")}
        </Section>
        <Section title="History">
          <div className="flex flex-col text-[13px]">
            {sec.log.map((e, k) => <div key={k} className={`flex gap-4 py-2 ${ROW_RULE}`}><span className="w-[130px] shrink-0 text-state-inactive">{e.at}</span><span className="min-w-0">{e.text}</span></div>)}
          </div>
        </Section>
        </>
      )}
    </div>
  );
}


/** WA-E005: the Work Orders this Job's Work Requests produced, with their acceptance status. */
async function jobOrders(jobId: string) {
  const rows = await prisma.workOrder.findMany({ where: { workRequest: { job_id: jobId }, status: { not: "CANCELLED" } }, orderBy: { created_at: "desc" }, select: { id: true, order_number: true, status: true, buyer_accepted_at: true, provider_accepted_at: true } });
  return rows.map((r) => { const w = waitingOn(r); return { ...r, label: w ? PENDING_ON_LABEL[w] : WORK_ORDER_LABEL[r.status] }; });
}

/** OJ-E002: after a provider answers, their Matches row shows the rate they answered (else their rate card). */
function answeredRates<M extends { personId: string; rate: string | null }>(matches: M[], proposals: { providerPersonId: string; rate: { unitPriceCents: number; basis: string } | null }[]): M[] {
  const by = new Map(proposals.filter((p) => p.rate).map((p) => [p.providerPersonId, p.rate!]));
  return matches.map((m) => { const r = by.get(m.personId); return r ? { ...m, rate: `$${Math.round(r.unitPriceCents / 100)}${r.basis === "RATE" ? "/hr" : ""} answered` } : m; });
}

/** JS-E003: the Actions menu fits the job's status. */
function menuFor(stage: JobStage, id: string, orderId: string | null): JobMenuItem[] {
  const edit = { label: "Edit", href: `/hire?job=${id}&step=0` };
  const dup: JobMenuItem = { label: "Duplicate", act: "duplicate" };
  const hold: JobMenuItem = { label: "Put On Hold", act: "hold" };
  const close: JobMenuItem = { label: "Close Job", act: "close" };
  switch (stage) {
    case "DRAFT": return [edit, dup, { label: "Discard", act: "discard", confirm: "Discard this draft?" }];
    case "ACTIVE": return [edit, { label: "Invite Providers", href: `/work-requests/${id}/invite` }, dup, hold, close];
    case "COMPARING": return [{ label: "Edit (Amendment)", href: `/work-requests/${id}?tab=details&amend=1` }, { label: "Extend Deadline", act: "extend" }, { label: "Invite More", href: `/work-requests/${id}?tab=matches` }, hold, close, dup];
    case "REQUEST_TO_HIRE": case "FILLED": return [{ label: "View Order", href: orderId ? `/orders/${orderId}` : `/work-requests/${id}?tab=work-order` }, dup];
    case "ON_HOLD": return [{ label: "Resume", act: "resume" }, close];
    case "CLOSED": return [dup, { label: "Reopen", act: "reopen", confirm: "Reopen this job? It goes back to Active." }];
    default: return [dup];
  }
}
