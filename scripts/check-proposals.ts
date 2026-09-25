import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@/lib/prisma";
import { submitProposal, withdrawProposal } from "@/lib/proposals";
import { inviteIsOpen } from "@/lib/sourcing";
import { getStatistics } from "@/lib/statistics";

/**
 * ── ⚠⚠⚠ `check:proposals` (`P2-A8-E621` WS-A) ───────────────────────────
 *
 * ⚠ THE STOP GATE: *"the writer; the idempotency proof; the savings-figure
 * assertion; the dash→count list, measured."*
 *
 * ⚠⚠ IT WRITES REAL ROWS THROUGH THE REAL WRITER AND TEARS THEM DOWN. A gate
 * that only greps would pass against a `submitProposal` that never wrote
 * anything — and *"nothing creates a ProviderBid"* is the exact sentence this
 * brief exists to make false.
 */
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
  /* ── 1 · ⚠⚠⚠ THE SAVINGS FIGURE CANNOT TRAVEL ───────────────────────────
     ⚠ WS-A item 4: *"The proposal carries no estimated-savings figure and never
     sees one."* ⚠⚠ MEASURED AT THE PREMISE CHECK: no savings or roadmap field
     exists in the schema at all, so this is a rule to PRESERVE. ⚠⚠⚠ It is
     asserted on the SOURCE so that adding one becomes a failing build rather
     than a leak nobody notices. */
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
    let requestId: string | null = null;
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
      requestId = wr.id;

      const first = await submitProposal(V(provider.user_id), { workRequestId: wr.id });
      check("3 — ⚠⚠ a provider CAN propose — the writer writes", !first.replaced);
      const row = await prisma.providerBid.findUnique({
        where: { id: first.id },
        select: { submitted_at: true, status: true, bid_request_id: true, work_request_id: true },
      });
      /* ⚠ WS-A item 1: `submitted_at` is what *Proposals Sent* counts. */
      check("3 — ⚠ submitted_at is set", row?.submitted_at != null);
      check("3 — status is SUBMITTED", row?.status === "SUBMITTED");
      /* ⚠⚠⚠ THE OPEN SHAPE: no invite, and ruling 14's open half is reachable. */
      check("3 — ⚠⚠ an OPEN request takes a proposal with NO invite",
        row?.bid_request_id === null,
        "this is the half that was unreachable while bid_request_id was NOT NULL");
      check("3 — it is attached to the request directly", row?.work_request_id === wr.id);

      /* ── ⚠⚠⚠ IDEMPOTENCY: the second submit REPLACES ──────────────────── */
      const second = await submitProposal(V(provider.user_id), {
        workRequestId: wr.id,
        coverNote: "revised",
      });
      check("3 — ⚠⚠⚠ proposing twice REPLACES, it does not duplicate", second.replaced);
      check("3 — ⚠ and it is the same row", second.id === first.id);
      const count = await prisma.providerBid.count({ where: { work_request_id: wr.id } });
      check("3 — ⚠⚠ exactly ONE proposal exists for this provider",
        count === 1, `${count} — the @@unique is what makes this true`);
      const revised = await prisma.providerBid.findUnique({
        where: { id: first.id },
        select: { cover_note: true },
      });
      check("3 — ⚠ the replacement actually took", revised?.cover_note === "revised");

      /* ── 4 · ⚠⚠ WITHDRAWAL IS RECORDED, NOT DELETED ───────────────────── */
      await withdrawProposal(V(provider.user_id), first.id);
      const after = await prisma.providerBid.findUnique({
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
    } finally {
      /* ⚠⚠ SCOPED, and the proposals go first — `ProviderBid` cascades on the
         request, but the NOTIFICATION does not (no foreign key), so it is swept
         by its own dedupe key while the id still resolves (`E620`'s lesson). */
      if (requestId) {
        const made = await prisma.providerBid.findMany({
          where: { work_request_id: requestId },
          select: { id: true },
        });
        await prisma.notification.deleteMany({
          where: { dedupe_key: { in: made.map((m) => `work.proposal_received:${m.id}`) } },
        });
        await prisma.workRequest.deleteMany({ where: { id: requestId } });
      }
      /*
        ⚠⚠⚠ AND ANY ORPHAN A KILLED — OR MUTATED — RUN LEFT BEHIND.
        ⚠ The sweep above looks the notification up THROUGH its proposal, so if
        the proposal is already gone there is nothing to find. ⚠⚠ MEASURED: a
        mutation that made `withdrawProposal` DELETE instead of record left
        exactly that orphan, and it was found by counting rows rather than by
        anything failing.
        ⚠⚠⚠ SAFE TO SWEEP FOR THE SAME REASON `E620`'s IS: a `provider_bid`
        notification whose bid no longer exists cannot belong to a real
        proposal — nothing in the application deletes one (withdrawal RECORDS,
        it does not delete), so an orphan is by definition probe residue.
      */
      const notifs = await prisma.notification.findMany({
        where: { entity_type: "provider_bid" },
        select: { id: true, entity_id: true },
      });
      if (notifs.length > 0) {
        const live = new Set(
          (
            await prisma.providerBid.findMany({
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
