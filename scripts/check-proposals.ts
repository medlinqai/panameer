import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@/lib/prisma";
import { submitProposal, withdrawProposal, proposeEligibility, proposalsOn } from "@/lib/proposals";
import { inviteIsOpen } from "@/lib/sourcing";
import { getStatistics } from "@/lib/statistics";

let pass = 0;
const fails: string[] = [];
const check = (name: string, ok: boolean, why = "") => {
  if (ok) pass += 1;
  else fails.push(`${name}${why ? ` — ${why}` : ""}`);
};
const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
function walk(d: string, o: string[] = []): string[] {
  for (const e of readdirSync(d)) {
    const f = join(d, e);
    if (statSync(f).isDirectory()) walk(f, o);
    else if (/\.tsx?$/.test(f)) o.push(f);
  }
  return o;
}

const TAG = "E621 proposal probe";

async function main() {
  const SRC = walk("src");
  check("1 — the source scan has a population (E586)", SRC.length > 50, `${SRC.length}`);
  const SAVINGS = /\b(estimated_savings|estimatedSavings|savingsCents|savings_estimate)\b/;
  const leaks = SRC.filter((f) => SAVINGS.test(strip(readFileSync(f, "utf8"))));
  check(
    "1 — ⚠⚠⚠ no savings figure exists anywhere in src/",
    leaks.length === 0,
    `${leaks.join(", ")} — any provider who sees it prices against it`
  );
  const proposalsSrc = strip(readFileSync(join("src", "lib", "proposals.ts"), "utf8"));
  check(
    "1 — ⚠ and the proposal writer names no savings field",
    !SAVINGS.test(proposalsSrc) && !/roadmap/i.test(proposalsSrc)
  );

  /* ── 2 · ⚠⚠ THE PREDICATE IS IMPORTED, NOT RESTATED (WS-A item 5) ────── */
  check(
    "2 — the writer imports inviteIsOpen rather than restating it",
    /inviteIsOpen\(/.test(proposalsSrc) &&
      !/status === "DECLINED"|status === "EXPIRED"/.test(proposalsSrc),
    "a second copy of 'is this invite open' is how the two drift"
  );
  /* ⚠⚠ AND THE PREDICATE ITSELF CHECKS BOTH HALVES. A status check alone would
     let a provider bid a week after the closing date, because nothing sweeps
     `responds_by` into `EXPIRED`. */
  const past = new Date(Date.now() - 86_400_000);
  const future = new Date(Date.now() + 86_400_000);
  check("2 — an ISSUED invite in date is open", inviteIsOpen({ status: "ISSUED", responds_by: future }));
  check("2 — ⚠⚠ an ISSUED invite PAST its closing date is CLOSED",
    !inviteIsOpen({ status: "ISSUED", responds_by: past }),
    "the status still reads ISSUED — nothing rewrites it, which is the point");
  check("2 — a DECLINED invite is closed", !inviteIsOpen({ status: "DECLINED", responds_by: future }));
  check("2 — a WITHDRAWN invite is closed", !inviteIsOpen({ status: "WITHDRAWN", responds_by: future }));
  check("2 — a DRAFT invite is closed — one nobody sent is not an invite",
    !inviteIsOpen({ status: "DRAFT", responds_by: future }));
  check("2 — ⚠ a RESPONDED invite stays open, so an edit can replace",
    inviteIsOpen({ status: "RESPONDED", responds_by: future }));

  /* ── 3 · ⚠⚠⚠ THE ROUND TRIP, THROUGH THE REAL WRITER ─────────────────── */
  /* ⚠ The P-Account comes through the COMPANY, not off the Person — that is
     the backbone's shape (`resolveBuyer` does the same). */
  const buyer = await prisma.person.findFirst({
    /* ⚠ `company_id` is NOT NULL on `Person`, so every person has one. */
    where: { NOT: { user_id: null } },
    select: { id: true, user_id: true, company: { select: { p_account_id: true } } },
  });
  const provider = await prisma.person.findFirst({
    where: { AND: [{ NOT: { user_id: null } }, { NOT: { id: buyer?.id ?? "" } }] },
    select: { id: true, user_id: true },
  });
  if (!buyer?.user_id || !buyer.company?.p_account_id || !provider?.user_id) {
    check("3 — a buyer and a provider exist to walk this (E586)", false, "not found");
  } else {
    const V = (userId: string) => ({ userId }) as never;
    /* ⚠⚠ EVERY PROBE REQUEST THIS RUN CREATES, so the teardown sweeps all of
       them. ⚠ It was a single `requestId` until `E681` WS-C added a second
       request for the rate round trip — and a teardown that knows about one row
       while the probe makes two is how an orphan survives a green gate. */
    const requestIds: string[] = [];
    try {
      const wr = await prisma.workRequest.create({
        data: {
          buyer_person_id: buyer.id,
          p_account_id: buyer.company.p_account_id,
          title: TAG,
          status: "POSTED",
          proposal_access: "OPEN",
        },
        select: { id: true },
      });
      requestIds.push(wr.id);

      const first = await submitProposal(V(provider.user_id), { workRequestId: wr.id });
      check("3 — ⚠⚠ a provider CAN propose — the writer writes", !first.replaced);
      const row = await prisma.proposal.findUnique({
        where: { id: first.id },
        select: { submitted_at: true, status: true, proposal_request_id: true, work_request_id: true },
      });
      /* ⚠ WS-A item 1: `submitted_at` is what *Proposals Sent* counts. */
      check("3 — ⚠ submitted_at is set", row?.submitted_at != null);
      check("3 — status is SUBMITTED", row?.status === "SUBMITTED");
      /* ⚠⚠⚠ THE OPEN SHAPE: no invite, and ruling 14's open half is reachable. */
      check("3 — ⚠⚠ an OPEN request takes a proposal with NO invite",
        row?.proposal_request_id === null,
        "this is the half that was unreachable while proposal_request_id was NOT NULL");
      check("3 — it is attached to the request directly", row?.work_request_id === wr.id);

      /* ── ⚠⚠⚠ IDEMPOTENCY: the second submit REPLACES ──────────────────── */
      const second = await submitProposal(V(provider.user_id), {
        workRequestId: wr.id,
        coverNote: "revised",
      });
      check("3 — ⚠⚠⚠ proposing twice REPLACES, it does not duplicate", second.replaced);
      check("3 — ⚠ and it is the same row", second.id === first.id);
      const count = await prisma.proposal.count({ where: { work_request_id: wr.id } });
      check("3 — ⚠⚠ exactly ONE proposal exists for this provider",
        count === 1, `${count} — the @@unique is what makes this true`);
      const revised = await prisma.proposal.findUnique({
        where: { id: first.id },
        select: { cover_note: true },
      });
      check("3 — ⚠ the replacement actually took", revised?.cover_note === "revised");

      /* ── 4 · ⚠⚠ WITHDRAWAL IS RECORDED, NOT DELETED ───────────────────── */
      await withdrawProposal(V(provider.user_id), first.id);
      const after = await prisma.proposal.findUnique({
        where: { id: first.id },
        select: { status: true, submitted_at: true },
      });
      check("4 — ⚠⚠⚠ a withdrawn proposal STILL EXISTS", after !== null,
        "deleting it reads to the buyer as though it was never sent");
      check("4 — its status records the withdrawal", after?.status === "WITHDRAWN");
      check("4 — ⚠ and submitted_at is untouched — they DID send it",
        after?.submitted_at != null);

      /* ── 5 · ⚠⚠⚠ THE DASH BECAME A COUNT (WS-A item 6) ────────────────── */
      /* ⚠ `getStatistics` takes ids, not a viewer — personId, userId and the
         provider profile (nullable). */
      const profile = await prisma.providerProfile.findFirst({
        where: { person_id: provider.id },
        select: { id: true },
      });
      const stats = await getStatistics(provider.id, provider.user_id, profile?.id ?? null, "all");
      const sent = (stats as { work: { proposalsSent: unknown } }).work.proposalsSent;
      check(
        "5 — ⚠⚠⚠ Proposals Sent is a NUMBER, not a dash",
        typeof sent === "number",
        `${JSON.stringify(sent)} — it read "nothing creates one", and now something does`
      );
      check("5 — ⚠ and it counts this provider's proposal",
        typeof sent === "number" && sent >= 1, `${sent}`);

      /* ── 6 · ⚠⚠⚠ THE WRITER IS REACHABLE FROM A PAGE (`E681` WS-C) ───────
         ⚠⚠⚠ THIS IS THE ASSERTION THAT WOULD HAVE CAUGHT `E665`. Every check
         above passed for weeks while `submitProposal` had **no caller outside
         this file and two sibling gates** — a writer proved correct and proved
         unreachable at the same time, by the same suite.
         ⚠⚠ A GATE THAT ONLY EXERCISES A FUNCTION CANNOT SEE THAT NOTHING CALLS
         IT. So this counts importers in `src/` specifically, and `scripts/` does
         not count towards it — a check script importing the writer is what the
         defect looked like, not what fixes it. */
      /*
        ⚠⚠⚠ IT NAMES `submitProposal`, NOT THE MODULE — AND THE FIRST DRAFT OF
        THIS ASSERTION DID NOT. Matching `from "@/lib/proposals"` alone passes on
        the PAGE, which imports `proposeEligibility` from the same module, so the
        writer could go back to having no caller at all and this would stay green.
        ⚠⚠ That is `decisions_2026-09-23.md` §11 — *"a gate can assert the right
        rule about the wrong thing"* — caught here by asking what the mutation
        would be before running it.
      */
      const importsWriter = SRC.filter((f) => {
        const s = strip(readFileSync(f, "utf8"));
        return /from "@\/lib\/proposals"/.test(s) && /submitProposal\(/.test(s);
      });
      check(
        "6 — ⚠⚠⚠ something in src/ CALLS the proposal writer",
        importsWriter.length > 0,
        "the writer existed and was unreachable — scripts/ does not count, and importing the module is not calling it"
      );
      const routeFile = join(
        "src", "app", "api", "work-requests", "[id]", "propose", "route.ts"
      );
      const routeSrc = strip(readFileSync(routeFile, "utf8"));
      check("6 — the propose route calls submitProposal", /submitProposal\(/.test(routeSrc));
      check(
        "6 — ⚠⚠ and it is gated to PROVIDERS, not buyers",
        /guardApi\("canProvideServices"\)/.test(routeSrc),
        "canHireTalent here would gate the provider out of their own proposal"
      );
      /*
        ⚠⚠⚠ BOTH SCHEMAS, NAMED SEPARATELY — AND THE FIRST DRAFT ASSERTED
        `/\.strict\(\)/` ALONE, WHICH IS THE SAME TRAP AS §6's IMPORT CHECK. Two
        schemas in this file carry it: the body (`.strict();`) and the nested rate
        object (`.strict()` then `.nullish()`). ⚠⚠ A bare match passes while
        EITHER survives, so dropping it from the body — the one that matters for a
        misspelled `rate` — would have stayed green. ⚠ Found by mutating it and
        watching the gate pass.
      */
      check(
        "6 — ⚠⚠ the BODY schema is .strict(), so a misspelled rate is refused",
        /\.strict\(\);/.test(routeSrc),
        "a dropped rate key posts a proposal with no price and tells nobody"
      );
      check(
        "6 — ⚠ and the nested rate object is strict too",
        /\.strict\(\)\s*\.nullish\(\)/.test(routeSrc),
        "unitPrice instead of unitPriceCents would be silently ignored"
      );

      /* ── 7 · ⚠⚠⚠ ONE DEFINITION OF WHO MAY PROPOSE (`E585`) ──────────────
         ⚠⚠ The page renders the form, so it has to know the answer — and the
         cheap way to know it is to restate the writer's four checks in the page.
         ⚠⚠⚠ THAT IS THE DRIFT THIS ASSERTS AGAINST, and it fails on the SHAPE
         rather than on a count: the page may not name the switch, the invite
         predicate or the status literal at all. */
      const pageFile = join("src", "app", "(app)", "find-work", "[id]", "page.tsx");
      const pageSrc = strip(readFileSync(pageFile, "utf8"));
      check(
        "7 — the page asks proposeEligibility",
        /proposeEligibility\(/.test(pageSrc)
      );
      check(
        "7 — ⚠⚠⚠ and the page restates NONE of the rule",
        !/proposal_access|inviteIsOpen|"POSTED"|ALREADY_DECIDED/.test(pageSrc),
        "two definitions of 'may I propose' disagree in public — as a form that renders and then refuses"
      );
      /* ⚠⚠ AND THE TWO AGREE IN FACT, NOT ONLY BY IMPORT. An INVITE_ONLY
         request this provider was never invited to: the predicate must refuse it
         with the SAME code the writer throws. ⚠ Proving it behaviourally is what
         makes the grep above more than a naming convention. */
      const closed = await prisma.workRequest.create({
        data: {
          buyer_person_id: buyer.id,
          p_account_id: buyer.company.p_account_id,
          title: TAG,
          status: "POSTED",
          proposal_access: "INVITE_ONLY",
        },
        select: { id: true },
      });
      requestIds.push(closed.id);
      const verdict = await proposeEligibility(provider.id, closed.id);
      check(
        "7 — ⚠⚠ an uninvited provider is refused NOT_INVITED by the predicate",
        verdict.can === false && verdict.code === "NOT_INVITED",
        JSON.stringify(verdict)
      );
      let thrownCode = "";
      await submitProposal(V(provider.user_id), { workRequestId: closed.id }).catch(
        (e: Error & { code?: string }) => {
          thrownCode = e.code ?? "";
        }
      );
      check(
        "7 — ⚠⚠⚠ and the WRITER throws that same code — one definition",
        thrownCode === "NOT_INVITED",
        `${thrownCode || "nothing thrown"} — if these ever differ, the form renders where the handler refuses`
      );

      /* ── 8 · ⚠⚠⚠ THE RATE LINE — WS-C's OTHER HALF ──────────────────────
         ⚠⚠ `ProposalLine` IS IN WS-C's SPEC AND §3 NEVER PRICED ANYTHING —
         every proposal it submits has no rate, so `writeRate` was exercised only
         by its early return. ⚠ This walks the priced path. */
      const priced = await prisma.workRequest.create({
        data: {
          buyer_person_id: buyer.id,
          p_account_id: buyer.company.p_account_id,
          title: TAG,
          status: "POSTED",
          proposal_access: "OPEN",
        },
        select: { id: true },
      });
      requestIds.push(priced.id);
      const p1 = await submitProposal(V(provider.user_id), {
        workRequestId: priced.id,
        rate: { unitPriceCents: 18_500 },
      });
      const lines1 = await prisma.proposalLine.findMany({
        where: { proposal_id: p1.id },
        select: { unit_price_cents: true, uom: true, basis: true, quantity: true },
      });
      check("8 — ⚠⚠ a rate writes exactly ONE ProposalLine", lines1.length === 1,
        `${lines1.length}`);
      check("8 — ⚠ at the cents it was given", lines1[0]?.unit_price_cents === 18_500,
        `${lines1[0]?.unit_price_cents}`);
      check("8 — a rate with no unit defaults to HOUR", lines1[0]?.uom === "HOUR");
      check("8 — and to the RATE basis", lines1[0]?.basis === "RATE");
      /* ⚠⚠⚠ `quantity` IS NULL ON PURPOSE — *"the provider states a rate; the
         buyer's dates decide how many hours"*. A provider-supplied quantity
         would be a second source for the number the buyer's screen computes. */
      check("8 — ⚠⚠ quantity is NULL — the buyer's dates decide the hours",
        lines1[0]?.quantity === null, `${lines1[0]?.quantity}`);

      /* ⚠⚠⚠ REPLACED, NOT APPENDED. Two priced lines on one proposal is two
         prices, and the buyer's screen would have to pick one. */
      const p2 = await submitProposal(V(provider.user_id), {
        workRequestId: priced.id,
        rate: { unitPriceCents: 22_000, basis: "AMOUNT" },
      });
      check("8 — revising the rate is the same proposal", p2.id === p1.id && p2.replaced);
      const lines2 = await prisma.proposalLine.findMany({
        where: { proposal_id: p1.id },
        select: { unit_price_cents: true, basis: true },
      });
      check("8 — ⚠⚠⚠ still exactly ONE line — the rate was REPLACED",
        lines2.length === 1,
        `${lines2.length} — a history of prices is not a price`);
      check("8 — ⚠ and it is the NEW rate", lines2[0]?.unit_price_cents === 22_000,
        `${lines2[0]?.unit_price_cents}`);
      check("8 — the basis moved with it", lines2[0]?.basis === "AMOUNT");
      /* ⚠ A rate of 0 or a fraction of a cent is refused rather than stored. */
      let badRate = "";
      await submitProposal(V(provider.user_id), {
        workRequestId: priced.id,
        rate: { unitPriceCents: 0 },
      }).catch((e: Error & { code?: string }) => { badRate = e.code ?? ""; });
      check("8 — ⚠⚠ a zero rate is refused", badRate === "BAD_RATE", badRate || "accepted");

      /* ── 9 · ⚠⚠ THE FORM ROUNDS MONEY, IT DOES NOT TRUNCATE ─────────────
         ⚠⚠⚠ `19.99 * 100` IS `1998.9999999999998` IN IEEE 754, so `Math.trunc`
         bills every provider a cent light. ⚠ Asserted on the source because no
         row can show the difference once the value is already an integer. */
      const formSrc = strip(
        readFileSync(join("src", "components", "work", "ProposeRate.tsx"), "utf8")
      );
      check(
        "9 — ⚠⚠⚠ the form ROUNDS dollars to cents",
        /Math\.round\([^)]*\*\s*100\)/.test(formSrc) && !/Math\.trunc|Math\.floor|parseInt/.test(formSrc),
        "Math.trunc on 19.99 stores 1998 — a cent light on every submission"
      );
      /* ⚠⚠⚠ AND IT ASKS FOR NO INSTRUMENT. The standing rule is absolute: no
         card number, CVV or expiry may be typed into Panameer code. A rate form
         is exactly where somebody would later add "how would you like to be
         paid", so the ban is asserted here rather than trusted. */
      check(
        "9 — ⚠⚠⚠ the rate form collects NO card or account details",
        !/card[_ ]?number|cardNumber|\bcvv\b|\bcvc\b|expiry|routing|iban|account[_ ]?number/i.test(formSrc),
        "a rate is what a provider charges, not how they get paid"
      );
      /* ⚠ And it moves no money: WS-C touches no Payment and computes no cut. */
      check(
        "9 — ⚠⚠ neither the form nor the route names Payment or a cut",
        !/payment|payout|service[_ ]?fee|\bcut\b/i.test(formSrc) &&
          !/payment|payout|service[_ ]?fee/i.test(routeSrc),
        "ruling 25 — no money moves in this chain"
      );

      /* ── 10 · ⚠⚠⚠ WS-D — THE BUYER READS THEM, AND WRITES NOTHING ────────
         ⚠ `proposalsOn` needs a viewer `resolveBuyer` accepts, which means
         `is_service_buyer`. The §3 buyer is picked on "has a user_id" alone, so
         this section resolves its own and SKIPS rather than failing if the seed
         has none — a gate that cannot find its population says so (`E586`). */
      const realBuyer = await prisma.person.findFirst({
        where: { NOT: { user_id: null }, is_service_buyer: true },
        select: { id: true, user_id: true, company: { select: { p_account_id: true } } },
      });
      if (!realBuyer?.user_id) {
        check("10 — a service buyer exists to read proposals (E586)", false, "none seeded");
      } else {
        const wr2 = await prisma.workRequest.create({
          data: {
            buyer_person_id: realBuyer.id,
            p_account_id: realBuyer.company.p_account_id,
            title: TAG, status: "POSTED", proposal_access: "OPEN",
          },
          select: { id: true },
        });
        requestIds.push(wr2.id);
        await submitProposal(V(provider.user_id), {
          workRequestId: wr2.id,
          coverNote: "ten years of this",
          rate: { unitPriceCents: 15_000 },
        });

        const seen = await proposalsOn(V(realBuyer.user_id), wr2.id);
        check("10 — ⚠⚠ the buyer sees the proposal", seen.length === 1, `${seen.length}`);
        check("10 — ⚠ with its rate", seen[0]?.rate?.unitPriceCents === 15_000,
          `${seen[0]?.rate?.unitPriceCents}`);
        check("10 — with the provider's NAME, not an id",
          !!seen[0]?.providerName && seen[0].providerName !== seen[0].providerPersonId);
        check("10 — and a member-facing status label",
          seen[0]?.statusLabel === "Submitted", seen[0]?.statusLabel);
        /* ⚠⚠ ON AN OPEN REQUEST THE PROPOSAL IS NOT INVITED, and the page prints
           "Found this request" off exactly this. */
        check("10 — ⚠ an uninvited proposal reports itself as such",
          seen[0]?.invited === false);

        /* ⚠⚠⚠ A PROVIDER'S UNSENT DRAFT IS NOT A PROPOSAL. `status` defaults to
           DRAFT in the schema, so the filter is on `submitted_at` — the column
           *Proposals Sent* already counts — rather than on the enum. ⚠ Written
           directly here because NOTHING in the app writes a draft bid, which is
           precisely why a filter on the enum would look correct and prove
           nothing. */
        const other = await prisma.person.findFirst({
          where: { NOT: [{ user_id: null }, { id: provider.id }, { id: realBuyer.id }] },
          select: { id: true },
        });
        if (other) {
          await prisma.proposal.create({
            data: {
              proposal_number: `PRO-DRAFT-${Date.now().toString(36)}`,
              work_request_id: wr2.id,
              provider_person_id: other.id,
              status: "DRAFT",
              submitted_at: null,
            },
          });
          const withDraft = await proposalsOn(V(realBuyer.user_id), wr2.id);
          check(
            "10 — ⚠⚠⚠ an UNSENT draft is NOT shown to the buyer",
            withDraft.length === 1,
            `${withDraft.length} — submitted_at is the question, not the status enum`
          );
        }

        /* ⚠⚠ A WITHDRAWN PROPOSAL STAYS VISIBLE. `withdrawProposal`'s own
           reason: *"a deleted proposal reads to the buyer as though it was never
           sent"* — hiding it here would recreate that one layer up. */
        const mine = await prisma.proposal.findFirst({
          where: { work_request_id: wr2.id, provider_person_id: provider.id },
          select: { id: true },
        });
        await withdrawProposal(V(provider.user_id), mine!.id);
        const afterW = await proposalsOn(V(realBuyer.user_id), wr2.id);
        check("10 — ⚠⚠ a WITHDRAWN proposal is still shown", afterW.length === 1);
        check("10 — ⚠ and it says so", afterW[0]?.statusLabel === "Withdrawn",
          afterW[0]?.statusLabel);

        /* ⚠⚠⚠ OWNER-SCOPED: ANOTHER BUYER SEES NOTHING, AND NOT AN EMPTY LIST —
           `loadOwned` throws, so "not yours" and "does not exist" are the same
           answer (the page 404s on both). */
        const otherBuyer = await prisma.person.findFirst({
          where: { NOT: [{ user_id: null }, { id: realBuyer.id }], is_service_buyer: true,
            company: { p_account_id: { not: realBuyer.company.p_account_id } } },
          select: { user_id: true },
        });
        if (otherBuyer?.user_id) {
          let refused = false;
          await proposalsOn(V(otherBuyer.user_id), wr2.id).catch(() => { refused = true; });
          check(
            "10 — ⚠⚠⚠ a DIFFERENT buyer cannot read these proposals",
            refused,
            "owner-scoped in the lib, not only in the page that calls it"
          );
        }
      }

      /* ── 11 · ⚠⚠⚠ WS-D IS READ-ONLY, AND THE PAGE MUST STAY THAT WAY ─────
         ⚠⚠ The brief's line is *"READ-ONLY — no decision is taken here."*
         Shortlisting, declining and awarding are `selectProvider` (WS-F), which
         has NO surface — so a control here would be `E579`: a button whose
         handler does not exist. ⚠ Asserted on the source, because the day
         somebody adds a Select button this is the only thing that objects. */
      const buyerPage = strip(
        readFileSync(join("src", "app", "(app)", "work-requests", "[id]", "page.tsx"), "utf8")
      );
      check(
        "11 — the buyer's page reads proposals through proposalsOn",
        /proposalsOn\(/.test(buyerPage)
      );
      /*
        ── ⚠⚠⚠ THIS ASSERTION CHANGED BECAUSE THE RULING CHANGED (`E684` WS-F) ─

        ⚠⚠ **IT IS `check:rollup`'s CASE, NOT `check:cert-skills`'.** WS-D
        asserted that NO selection writer was reachable from this page, and that
        was right **while `selectProvider` had no surface** — a control then
        would have been `E579`, a door onto a wall. ⚠⚠⚠ **WS-F IS THAT SURFACE,
        ruled by Scott on 2026-09-27**, so the page now reaches it on purpose.
        ⚠ SUPERSEDED, quoted not deleted (`E164`):
        //   "11 — ⚠⚠⚠ and it takes NO decision — no selection writer is reachable from it",
        //   !/selectProvider|@/lib/selection|shortlist|Shortlist|awardTo|declineProposal/.test(buyerPage),

        ⚠⚠ **WHAT SURVIVES IS THE HALF THAT WAS NEVER ABOUT TIMING:** selecting
        is a DECISION and gets a deliberate control; **shortlisting and
        declining still have no writer at all**, so a control for either would
        still be a door onto a wall.
      */
      check(
        "11 — ⚠⚠ the decision is DELIBERATE — selection is reached through its own route",
        /\/select|SelectProposal/.test(buyerPage),
        "WS-F gave selectProvider a surface; this page is it"
      );
      check(
        "11 — ⚠⚠⚠ and still NO writer exists for shortlisting or declining",
        !/shortlist|Shortlist|awardTo|declineProposal/.test(buyerPage),
        "neither has a writer, so a control for either is still E579"
      );
      check(
        "11 — ⚠⚠ and it POSTs nothing about a proposal",
        !/fetch\([^)]*propos/i.test(buyerPage),
        "a read-only compare view that posts is not read-only"
      );
    } finally {
      /* ⚠⚠ SCOPED, and the proposals go first — `Proposal` cascades on the
         request, but the NOTIFICATION does not (no foreign key), so it is swept
         by its own dedupe key while the id still resolves (`E620`'s lesson). */
      if (requestIds.length > 0) {
        const made = await prisma.proposal.findMany({
          where: { work_request_id: { in: requestIds } },
          select: { id: true },
        });
        await prisma.notification.deleteMany({
          where: { dedupe_key: { in: made.map((m) => `work.proposal_received:${m.id}`) } },
        });
        await prisma.workRequest.deleteMany({ where: { id: { in: requestIds } } });
      }
      /*
        ⚠⚠⚠ AND ANY ORPHAN A KILLED — OR MUTATED — RUN LEFT BEHIND.
        ⚠ The sweep above looks the notification up THROUGH its proposal, so if
        the proposal is already gone there is nothing to find. ⚠⚠ MEASURED: a
        mutation that made `withdrawProposal` DELETE instead of record left
        exactly that orphan, and it was found by counting rows rather than by
        anything failing.
        ⚠⚠⚠ SAFE TO SWEEP FOR THE SAME REASON `E620`'s IS: a `proposal`
        notification whose bid no longer exists cannot belong to a real
        proposal — nothing in the application deletes one (withdrawal RECORDS,
        it does not delete), so an orphan is by definition probe residue.
      */
      const notifs = await prisma.notification.findMany({
        where: { entity_type: "proposal" },
        select: { id: true, entity_id: true },
      });
      if (notifs.length > 0) {
        const live = new Set(
          (
            await prisma.proposal.findMany({
              where: { id: { in: notifs.map((n) => n.entity_id!).filter(Boolean) } },
              select: { id: true },
            })
          ).map((b) => b.id)
        );
        const orphans = notifs.filter((n) => !n.entity_id || !live.has(n.entity_id));
        if (orphans.length > 0) {
          await prisma.notification.deleteMany({
            where: { id: { in: orphans.map((o) => o.id) } },
          });
        }
      }

      const left = await prisma.workRequest.count({ where: { title: TAG } });
      check("5 — ⚠ the probe cleaned up after itself", left === 0, `${left} left`);
    }
  }

  await prisma.$disconnect();
  console.log(`check:proposals — ${fails.length ? `${fails.length} FAILED, ` : ""}${pass} passed`);
  for (const f of fails) console.log(`\n  ✗ ${f}`);
  if (fails.length) process.exit(1);
}

main();
