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
  try {
    detail = await getWorkRequestDetail(viewer, id);
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
        {/* ⚠⚠ ONE PLACE (`P2-A8-E679`) — this pill read `posted ? … : "Draft"`,
            so an ORDERED request was badged `Draft`.
            ⚠ SUPERSEDED, quoted not deleted (`E164`):
            //   className={ posted ? "…emerald…" : "…ink…" }
            //   {posted ? "Posted" : "Draft"} */}
        <span className={workRequestStatusPillClass(detail.status)}>
          {WORK_REQUEST_STATUS_LABEL[detail.status]}
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

      {/*
        ⚠ POST LIVES HERE TOO, not only at the end of the wizard. A requester who
        left the wizard at step 8 and came back has a DRAFT and no obvious way to
        post it; `/create-work` resumes the LATEST draft, which is not necessarily
        this one. The route it calls is the existing `POST .../post`, unchanged —
        including its identity gate.
      */}
      {/*
        ── ⚠⚠⚠ DRAFT-ONLY, NOT "NOT POSTED" (`P2-A8-E684b`) ─────────────────

        ⚠⚠⚠ **AN ORDERED REQUEST WAS TOLD IT WAS STILL A DRAFT.** `posted` is
        `status === "POSTED"`, so `!posted` is TRUE for `ASSIGNED`, `ORDERED`
        **and** `CANCELLED` — this panel offered *"This request is still a
        draft"* and a wizard link on a request that is under contract.
        ⚠⚠ **IT IS `E679`'s FAMILY EXACTLY** — a boolean standing in for a
        five-value enum — and WS-A fixed the pill and the subtitle while this
        block kept the old shape. ⚠ It was unreachable until now because
        nothing could move a request past `POSTED`; **WS-F builds both
        transitions, so it went live with them** — the same expiry that made
        `E680(b)` this brief's problem rather than a later one.
        ⚠ SUPERSEDED, quoted not deleted (`E164`):
        //   {!posted && (
      */}
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
        {/*
          ⚠⚠⚠ `key` FORCES A REMOUNT WHEN THE STATUS MOVES (`P2-A8-E684c`).
          `WorkRequestLines` holds `useState(initial)`, and React KEEPS client
          state across a `router.refresh()` — so after selecting, the section
          still read *"No provider assigned · Needs provider and price"* for a
          line that had just been given a provider and a rate.
          ⚠⚠ **I MADE THIS REACHABLE:** until WS-F, nothing outside that
          component ever changed a line, so its local copy could not go stale.
          ⚠ The key is the STATUS because that is precisely what moves when
          selection or ordering rewrites the lines; a remount then is correct
          and costs one render.
        */}
        <WorkRequestLines key={detail.status} initial={detail} />
      </div>

      {/* ══ THE PROPOSALS THAT CAME BACK ═══════════════════════════════════
          ⚠⚠⚠ `P2-A8-E682` WS-D. **READ-ONLY — NO DECISION IS TAKEN HERE.**
          Shortlisting, declining and awarding are `selectProvider` (WS-F),
          which has no surface yet, so this section renders NO control that
          writes. ⚠ A `Select` button here would be `E579` exactly.

          ⚠⚠ IT SITS ABOVE THE INVITATIONS, AND THE NOTIFICATION IS WHY. The
          registry sends `work.proposal_received` to `/work-requests/{id}` —
          this page — so a buyer arriving from their bell is here to read a
          PROPOSAL. Landing them above the list of who was asked, and making
          them scroll past it to find what came back, would answer a different
          question than the one they clicked. */}
      {/*
        ── ⚠⚠⚠ THE BRANCH (`P2-A8-E712` WS-B) — NOT RENDERED, NOT HIDDEN ──────────

        ⚠⚠ **SCOTT, 2026-09-27:** an externally sourced request *"skips the sourcing
        process"* — *"no invite step, no bid list, no compare view."*
        ⚠⚠⚠ **THE BRIEF IS EXPLICIT AND SO IS THIS: `NOT HIDDEN WITH CSS. NOT RENDERED.`
        A CONTROL THAT EXISTS AND REFUSES IS `E579`** — and a `hidden` class would leave
        `Invite providers` in the DOM, reachable by keyboard, readable by a screen reader,
        and clickable by anyone who opened the panel.
        ⚠ **THE SOURCING RAIL IS TWO BLOCKS — THIS ONE (Proposals, with its steps and the
        award transition) AND `Invited to bid` BELOW.** Both are guarded on the same
        boolean, and `check:externally-sourced` asserts the pair together so one cannot be
        guarded while the other is forgotten.
        ⚠⚠ **WHAT DELIBERATELY STAYS: `AssignDirectly` BETWEEN THEM.** That is
        `assignProviderDirectly`, `route: "DIRECT"` — **the externally sourced path's own
        destination**, naming a provider and a rate. ⚠⚠⚠ Hiding it here would remove the
        one door this kind of request is supposed to walk through, which would be `E579`
        committed in the other direction.
      */}
      {!detail.soleSourced && (
      <div className="mt-8">
        <h2 className="font-display text-[20px] font-bold tracking-[-0.3px]">
          Proposals <span className="font-normal text-ink-2">({proposals.length})</span>
        </h2>
        {proposals.length === 0 ? (
          /*
            ⚠⚠ AN HONEST ZERO WITH THE FIRST MOVE NAMED (§4), not a report of
            emptiness — and the two reasons are genuinely different, so the copy
            splits on the one fact that decides it.
          */
          <p className="mt-3 text-[14.5px] text-ink-2">
            {posted
              ? "No proposals yet. Providers can find this request, and inviting someone puts it in front of them directly."
              : "No proposals yet. A request takes proposals once it is posted."}
          </p>
        ) : (
          <>
            {/*
              ⚠⚠⚠ THE ORDER IS STATED BECAUSE IT IS NOT A RANKING. Sorting by
              price would be a judgement, on a screen whose whole instruction is
              that no decision is taken here.
            */}
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
                    {/*
                      ⚠⚠⚠ "No rate given" IS NOT A DASH, AND THE DIFFERENCE IS
                      RULING 18. A dash means *we cannot count this*; a proposal
                      with no price is a thing that HAPPENED — the writer allows
                      a pitch before pricing — so it is reported in words.
                    */}
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

                  {/*
                    ── ⚠⚠⚠ THE TWO OPTIONAL STEPS (`E683a` WS-E) ─────────────
                    ⚠⚠ **WS-D MADE THIS SECTION READ-ONLY, AND THAT RULE IS
                    UNCHANGED: it forbids a DECISION.** Shortlisting, declining
                    and awarding are `selectProvider` (WS-F) and still have no
                    control here — `check:proposals` §11 names those writers and
                    fails if any becomes reachable from this page.
                    ⚠⚠⚠ An interview and a test are **not** decisions about who
                    gets the work: the brief calls both optional and says
                    **neither may be a precondition of WS-F**, and
                    `selection.ts` reads neither table.
                  */}
                  <ProposalSteps
                    workRequestId={detail.id}
                    providerPersonId={p.providerPersonId}
                    providerName={p.providerName}
                    interviewStatus={p.interviewStatus}
                    testStatus={p.testStatus}
                    tests={sendableTests}
                  />

                  {/*
                    ── ⚠⚠⚠ TRANSITION ONE (`E684` WS-F) ───────────────────────
                    ⚠⚠ **WS-D's READ-ONLY RULE ENDS HERE, DELIBERATELY AND BY
                    RULING**, not by drift: WS-D said *"no decision is taken
                    here"* because `selectProvider` had no surface and a control
                    would have been `E579`. WS-F is that surface.
                    ⚠ `check:proposals` §11 and `check:work-chain` §8 were
                    updated in this same commit and say so — the gate changed
                    because the RULING changed (`check:rollup`'s case), not
                    because the code drifted past it.
                  */}
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

      {/*
        ── ⚠⚠⚠ THE OTHER ROUTE, AND THE SECOND TRANSITION (`E684` WS-F) ──────

        ⚠⚠ **`AssignDirectly` IS WHAT REPLACES `Assign a provider…`'s WRITE.**
        That select wrote a NAME with no rate, no line status and no bid; this
        writes the pair through `assignProviderDirectly`, the `route: "DIRECT"`
        the model already named. ⚠ It is offered while nobody is selected yet —
        `ASSIGNED` and `ORDERED` both mean that question is answered.
        ⚠⚠⚠ **THE CAPABILITY IS NEVER ABSENT (rule 5):** the line PATCH stops
        accepting `providerPersonId` in this same commit, and this is the door
        that takes over from it.
      */}
      {(detail.status === "DRAFT" || detail.status === "POSTED") && options.length > 0 && (
        <AssignDirectly workRequestId={detail.id} providers={options} />
      )}
      {detail.status === "ASSIGNED" && <CreateOrder workRequestId={detail.id} />}

      {/* ══ WHO HAS BEEN INVITED ═══════════════════════════════════════════
          ⚠⚠ THE INVITATIONS, NOT THE RESPONSES.
          ⚠ SUPERSEDED, quoted not deleted (`E164`): *"`E392`'s fence: this
          brief creates invites and renders nothing that comes back. No bid
          rows, no statuses, no comparison — those are their own brief."*
          ⚠⚠ That brief is `E682` WS-D and it is the section ABOVE. The fence
          was right for `E392` and is simply spent; this section still shows the
          invitations only, which is what it was always for. */}
      {/*
        ⚠⚠⚠ THE SECOND HALF OF THE SAME BRANCH (`P2-A8-E712` WS-B). ⚠ Guarded on the same
        boolean as the Proposals block above, because **the `Invite providers` button lives
        here** — and an externally sourced request that still offers to invite bidders is
        the sourcing process it was created to skip.
      */}
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
