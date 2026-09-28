import { notFound } from "next/navigation";
import { guardPage } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { BackLink } from "@/components/console/BackLink";
import { WhoIsAsking } from "@/components/work/WhoIsAsking";
import { ProposeRate } from "@/components/work/ProposeRate";
import { getWorkDetailForProvider } from "@/lib/work-detail";
import { proposeEligibility } from "@/lib/proposals";

/**
 * ── ⚠⚠⚠ `/find-work/[id]` — THE PAGE A PROVIDER OPENS (`P2-A8-E664`) ───────
 *
 * ⚠⚠ **EVERY WORK CARD LINKED TO A 404 UNTIL THIS FILE EXISTED.**
 * `WorkFeed.tsx` has linked its card title to a detail route since `E025`,
 * recorded the missing route TWICE in its own comments, and handed it on; no
 * brief picked it up. ⚠⚠⚠ *"The seller half of WORK has no detail view at all,
 * so the first buyer to post produces a page of 404s rather than a page of
 * leads"* — `_RESURFACING_GAPS_2026-09-24.md` finding 1, *"the largest single
 * hole."*
 *
 * ── ⚠⚠⚠ WHY `/find-work/[id]` AND NOT `/work/[id]` — REPORTED, NOT SETTLED ─
 *
 * ⚠ The card's link WAS ``/work/${card.id}``, and it moved here **in the same
 * change as this file** — a link and its target in two commits is a window where
 * the 404 is still live.
 *
 * ⚠⚠ THREE MEASUREMENTS DECIDED IT, and every one of them is reversible if Scott
 * rules the other way (it is reported as an open stop):
 *   1. ⚠⚠ `/work` is the PUBLIC marketing seller page — `src/app/work/page.tsx`
 *      in `MarketingShell` — and it is allowlisted `category 1`, **EXACT match,
 *      no subtree**. A `[id]` beneath it would inherit NO shell, so a provider
 *      would open a leads page with no band, no header and no footer.
 *   2. ⚠⚠ `ROUTE_ACCESS` HAS NO `/work` ENTRY. `/find-work` is already registered
 *      `canProvideServices` **and is already in `proxy.ts`'s matcher**, so this
 *      route is gated at the edge by existing. Landing under `/work` would have
 *      needed a new `ROUTE_ACCESS` prefix **and** a new matcher literal — and
 *      `public-allowlist.spec.ts` fails in BOTH directions if the two disagree.
 *   3. ⚠ No path in this tree exists in two route groups today (measured
 *      2026-09-26), so `src/app/(app)/work/[id]` would have been the first, and
 *      this lane cannot run `npm run build` to prove Next accepts it.
 * ⚠⚠⚠ **THE FOLDER IS THE ONLY THING SCOTT'S RULING CHANGES.** The read, the
 * view model and this layout are identical either way.
 *
 * ⚠ **STATIC SIBLINGS WIN OVER `[id]` IN NEXT'S MATCHER**, so `/find-work/new`,
 * `/saved`, `/proposals`, `/invitations` and `/for-my-skills` are untouched.
 *
 * ── ⚠⚠⚠ THE PROPOSE FORM LANDED HERE — `E681` WS-C ───────────────────────
 *
 * ⚠ **SUPERSEDED, quoted not deleted (`E164`):** *"NO WRITER, NO FORM, NO
 * PROPOSE BUTTON. `lib/proposals.ts:222` HOLDS `prisma.proposal.create`
 * (`E621` WS-A) AND NOTHING IN `src/` IMPORTS IT — measured 2026-09-26; its only
 * importers are three `scripts/check-*.ts` gates. The writer exists and is
 * unreachable, so there is no route for a button to post to, and `E579` is
 * unambiguous: a control whose handler refuses is a door onto a wall. The entry
 * point belongs to the work chain, not to this page."*
 *
 * ⚠⚠ **EVERY WORD OF THAT WAS TRUE AND THE CONCLUSION HELD UNTIL THE HANDLER
 * EXISTED.** `POST /api/work-requests/[id]/propose` is now that handler, so the
 * button has somewhere to post and `E579` is satisfied rather than dodged.
 *
 * ⚠⚠⚠ **AND THE PAGE DOES NOT DECIDE WHO MAY PROPOSE.** It asks
 * `proposeEligibility` — the same function `submitProposal` throws from — so the
 * form cannot render where the handler would refuse, and the two cannot drift
 * (`E585`). ⚠ A refusal prints that function's own sentence.
 *
 * ── ⚠ THE FRAME IS A PROPOSAL. THERE IS NO MOCKUP FOR THIS PAGE ───────────
 *
 * ⚠⚠ None of the 22 mockups covers a provider-facing work detail page, so the
 * layout is the CARD's fields in the CARD's order, in the card's own split:
 * `WhoIsAsking` beside the request at ≥900px and under it below that — the
 * breakpoint `WorkFeed.tsx` already chose, and for the reason it already records
 * (*"squeezed into a 200px column beside the description at 390px it renders a
 * word per line"*). ⚠ Page background and chrome come from `AppShell`; the
 * content column is centred, which the gaps doc's frame lesson says is part of
 * the design and not a detail.
 *
 * ⚠⚠ **NO `PatternHeader`.** Rulings 23/33d/36d name the surfaces it governs —
 * the Account Information pages, Community, Groups, Mentors, Teams and `/learn` —
 * and all of them are LANDING pages whose header carries one to three FIGURES.
 * ⚠⚠⚠ This is a RECORD view, and the only figures it could put in that header
 * would be invented ones. Reported rather than assumed.
 */
export const metadata = { title: "Work Request · Panameer" };

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const viewer = await guardPage("canProvideServices");
  const { id } = await params;

  /*
    ⚠⚠ OWNER-SCOPED FROM THE SESSION, NEVER FROM THE REQUEST. The id in the URL
    names the WORK REQUEST; the person whose stage is being asked about is
    resolved from the session and cannot be supplied by a caller. Same shape as
    `ownProvider` in `lib/proposals.ts`.
  */
  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: { id: true },
  });

  const detail = await getWorkDetailForProvider({
    id,
    providerPersonId: person?.id ?? null,
  });

  /*
    ⚠⚠ A REQUEST THIS PROVIDER MAY NOT OPEN IS A 404, NOT A 403 — the buyer's own
    detail page sets that precedent and states why: *"telling a stranger that an
    id EXISTS but belongs to someone else is itself a leak."* ⚠ Here the filter is
    the STATUS rather than the owner, and the answer is the same: a DRAFT id and a
    nonexistent id are indistinguishable facts to a provider.
  */
  if (!detail) notFound();

  /*
    ⚠⚠⚠ ONE QUESTION, ASKED OF THE WRITER'S OWN PREDICATE (`E585`). Whether to
    render the form, and what to say when the answer is no, both come from here —
    the page states no rule of its own about status, invitations or decisions.
    ⚠ A provider with no `Person` row cannot propose and cannot be asked about:
    `proposeEligibility` is skipped rather than handed an empty id.
  */
  const eligibility = person
    ? await proposeEligibility(person.id, detail.id)
    : null;

  /*
    ⚠ THE META ROW IS THE CARD'S, IN THE CARD'S ORDER, and `filter(Boolean)` is
    what keeps a missing field from printing a dangling separator. Every entry is
    a column a buyer filled in — none is derived and none is invented.
  */
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

      {/*
        ⚠⚠ POSTED-AGO AND THE STAGE SIT TOGETHER because both answer "where is
        this, for me". ⚠⚠⚠ THE STAGE CHIP IS ABSENT WHEN THERE IS NO STAGE, and
        that is a MEASURED absence rather than an uncountable figure:
        `sourcingStageForProvider` runs its six queries and returns `null`
        meaning *"not in this process at all"* — its own words — and all six of
        its evidence sources now have writers. ⚠ So there is no dash and no
        reason to print: nothing is being withheld.
      */}
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

            {/*
              ⚠ THE FULL DESCRIPTION, NOT THE CARD'S THREE-LINE CLAMP. The clamp
              is what a card owes a scanner; the whole text is what a detail page
              is FOR. `whitespace-pre-wrap` keeps the paragraphs a requester
              typed, the way the buyer's own detail page already does.
            */}
            {detail.description && (
              <p className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed text-ink-2">
                {detail.description}
              </p>
            )}
          </div>

          {/*
            ⚠⚠ THE FORM SITS UNDER THE REQUEST, NOT BESIDE IT. A provider reads
            what is being asked for and then prices it; a rate box level with the
            first paragraph asks for a number before the work has been described.
            ⚠ At 390px the grid is one column anyway, so the reading order is the
            same at both widths — which is the point.
          */}
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
                        /* ⚠ Dates cross to the client as ISO strings — a `Date`
                           would be serialised anyway, and saying so here stops
                           the component guessing which it got. */
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

          {/*
            ⚠⚠⚠ A REFUSAL PRINTS THE PREDICATE'S OWN SENTENCE, and it is shown
            ONLY when there is something to explain. ⚠ `REQUEST_NOT_OPEN` is the
            one case that needs no notice: a provider cannot reach this page for a
            `DRAFT`, and a request that moved on already says so in the stage chip
            above — a second line would be telling them twice.
            ⚠⚠ `NOT_FOUND` is unreachable here by construction (the detail read
            already 404'd), and is left to the predicate rather than special-cased.
          */}
          {eligibility && !eligibility.can && eligibility.code !== "REQUEST_NOT_OPEN" && (
            <div className="mt-5 rounded-brand border border-line bg-white p-5">
              <p className="text-[15px] text-ink-2">{eligibility.message}</p>
              {/*
                ⚠⚠ THEIR OWN PROPOSAL IS STILL SHOWN WHEN IT CAN NO LONGER BE
                CHANGED. A page that hid it on refusal would read as though the
                proposal had been thrown away — the same argument that keeps a
                withdrawn proposal on the books rather than deleting it.
              */}
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

        {/*
          ⚠⚠ `WhoIsAsking` RENDERS UNEDITED. Its own docblock promised it *"will
          drop unchanged into a work-request detail page when one exists"* — this
          is that page, it takes a `BuyerIdentity` and reads nothing else, and
          the identity reaching it was redacted on the server by
          `buildBuyerIdentity` before the view model was built.
        */}
        <div className="min-w-0 rounded-brand border border-line bg-white p-5">
          <WhoIsAsking identity={detail.identity} />
        </div>
      </div>
    </div>
  );
}
