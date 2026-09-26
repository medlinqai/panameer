import { notFound } from "next/navigation";
import { guardPage } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { BackLink } from "@/components/console/BackLink";
import { WhoIsAsking } from "@/components/work/WhoIsAsking";
import { getWorkDetailForProvider } from "@/lib/work-detail";

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
 * ── ⚠⚠ NO WRITER, NO FORM, NO PROPOSE BUTTON ─────────────────────────────
 *
 * ⚠⚠⚠ `lib/proposals.ts:222` HOLDS `prisma.providerBid.create` (`E621` WS-A)
 * **AND NOTHING IN `src/` IMPORTS IT** — measured 2026-09-26; its only importers
 * are three `scripts/check-*.ts` gates. ⚠ **The writer exists and is
 * unreachable**, so there is no route for a button to post to, and `E579` is
 * unambiguous: a control whose handler refuses is a door onto a wall. ⚠⚠ The
 * entry point belongs to the work chain, not to this page.
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
