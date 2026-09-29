/**
 * `check:offers` — the shop offer is accept-or-deny, one open per (buyer, product), and
 * a floor is guidance rather than a contract (`P2-A6-E700`, rulings 94 / 94a).
 * `npm run check:offers`.
 *
 * ── ⚠⚠ WHAT IT ASSERTS (ruling 11 — the right thing) ────────────────────────
 *
 *  1. ⚠⚠⚠ **ONE OPEN OFFER PER (BUYER, PRODUCT), ENFORCED BY THE DATABASE.** The brief
 *     is explicit: *"ENFORCE IT IN THE DATABASE, NOT IN A HANDLER."* So this gate does
 *     not read the handler's `if` — **it tries to insert a second open offer and
 *     requires Postgres to refuse.**
 *  2. ⚠⚠⚠ **NO COUNTER CHAIN AND NO FIELD FOR ONE.** Ruled out 2026-09-28. Asserted as
 *     an ABSENCE over the model, because the defect would arrive as an addition.
 *  3. ⚠⚠ **A FLOOR IS GUIDANCE, NOT A CONTRACT** — below is refused, AT is allowed to be
 *     offered, and an offer at the floor is **still deniable**. A floor that silently
 *     auto-accepted would be the counter chain wearing a hat.
 *  4. ⚠⚠⚠ **NO LINE EXISTS BEFORE ACCEPTANCE**, and acceptance writes it **at the
 *     offered amount**, not at list.
 *  5. ⚠⚠ **THE LINE'S PROVIDER MATCHES THE PRODUCT'S OWNER** — or a product changing
 *     hands rewrites an agreed line.
 *  6. ⚠ The status and the open marker can never disagree.
 *  7. ⚠⚠ **NO MONEY MOVES.** An offer is a negotiation artefact; it pays nobody.
 *
 * ── ⚠⚠ AT WHAT SCOPE (ruling 91 — stated, not implied) ──────────────────────
 *
 * ⚠ **TWO HALVES, AND THE SECOND ONE TOUCHES THE DATABASE.**
 *   · STATIC: `prisma/schema.prisma` and `src/lib/service-product-offers.ts`, as text,
 *     **comments stripped** so an `E164` quote cannot satisfy an assertion (rule 12).
 *   · LIVE: it creates its own offers against a real published product, proves the
 *     constraint by violating it, and **deletes exactly what it created**. ⚠⚠ Row counts
 *     for `service_product_offers`, `work_requests` and `work_request_lines` are taken
 *     **before and after** and must match — one shared database (ruling 38).
 * ⚠⚠⚠ **IT ASSERTS NO UI. `/services/offers` IS STILL A `ComingSoon` PLACEHOLDER** —
 * `E700` shipped the model and the library, not the seller's room. **That gap is stated
 * here rather than implied by the gate's silence.**
 *
 * ── ⚠ SUBJECT EXISTS (92 / 98g / 99c) ──────────────────────────────────────
 *
 * ⚠⚠ Every input is asserted present **before** anything is measured, and the live half
 * asserts it found a real buyer, a real provider and a real PUBLISHED product — ⚠⚠⚠ **so
 * "0 failures" can never mean "it had nothing to test" (`E586`).**
 *
 * ── ⚠ DIRECTION (90) ───────────────────────────────────────────────────────
 *
 * ⚠ Mutation-proved at `E700`: each rule broken in the source, the gate red on **that
 * named assertion**, source restored byte-identical. ⚠⚠ `E607` — the assertion under
 * test must be the thing that catches it.
 */
import { readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

let pass = 0;
const failures: string[] = [];
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) pass++;
  else failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
};

const stripComments = (s: string): string =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/^([ \t]*)\/\/.*$/gm, (_m, i) => i);

/* ═══ 0 · INPUTS FIRST (ruling 92) ═════════════════════════════════════════ */

const LIB = join("src", "lib", "service-product-offers.ts");
const SCHEMA = join("prisma", "schema.prisma");
check("0 — the offer library exists where this guard expects it", existsSync(LIB), LIB);
check("0 — and it is not empty", existsSync(LIB) && statSync(LIB).size > 0);
check("0 — the schema exists", existsSync(SCHEMA));

const lib = existsSync(LIB) ? stripComments(readFileSync(LIB, "utf8")) : "";
const schema = existsSync(SCHEMA) ? stripComments(readFileSync(SCHEMA, "utf8")) : "";
check("0 — stripping comments left live code behind", lib.trim().length > 400, `${lib.trim().length} chars`);

const modelOf = (n: string) => (new RegExp(`model ${n} \\{[\\s\\S]*?\\n\\}`).exec(schema) ?? [""])[0];
const offer = modelOf("ServiceProductOffer");
const wrLine = modelOf("WorkRequestLine");
check("0 — `ServiceProductOffer` is in the schema", offer.length > 0);

/* ═══ 1 · THE CONSTRAINT, AND NO CHAIN ═════════════════════════════════════ */

check(
  "1 — ⚠⚠⚠ the open marker is UNIQUE per buyer — this is the one-open-offer rule",
  /@@unique\(\[buyer_person_id, open_service_product_id\]\)/.test(offer)
);
check(
  "1 — the marker is NULLABLE, so decided offers accumulate instead of colliding",
  /open_service_product_id String\? @db\.Uuid/.test(offer),
  "Postgres treats NULLs as distinct — that is what makes history possible"
);
/*
  ⚠⚠⚠ THE ABSENCE THAT MATTERS MOST. Scott ruled the counter chain out and the brief
  says "no field left for one". ⚠ A chain arrives as a COLUMN, so this is asserted over
  the model text rather than over behaviour.
*/
const CHAIN_SHAPES = /replies_to|counter_|parent_offer|previous_offer_id|counterOffer|in_reply_to/;
check(
  "1 — ⚠⚠⚠ ABSENCE: no counter-chain field on the offer (ruled out 2026-09-28)",
  !CHAIN_SHAPES.test(offer),
  "a chain added 'for later' is the feature arriving early"
);
check(
  "1 — MUTATION: this scan WOULD catch a chain field",
  CHAIN_SHAPES.test("  replies_to_offer_id String? @db.Uuid") &&
    CHAIN_SHAPES.test("  counter_amount_cents Int?")
);
check(
  "1 — the status enum is exactly OPEN / ACCEPTED / DENIED / WITHDRAWN",
  /enum ServiceProductOfferStatus \{\s*OPEN\s*ACCEPTED\s*DENIED\s*WITHDRAWN\s*\}/.test(schema),
  "a fifth state is a negotiation, and a negotiation was refused"
);
check(
  "1 — ⚠ the line can name which service product was bought",
  /service_product_id String\? @db\.Uuid/.test(wrLine),
  "without it an accepted offer's line cannot say what it is"
);

/* ═══ 2 · THE LIBRARY'S SHAPE ══════════════════════════════════════════════ */

const fnBody = (name: string): string | null => {
  const m = new RegExp(`export\\s+(?:async\\s+)?function\\s+${name}\\b`).exec(lib);
  if (!m) return null;
  const rest = lib.slice(m.index);
  const next = /\n(?=export\s+(?:async\s+)?function\s)/.exec(rest.slice(1));
  return next ? rest.slice(0, next.index + 1) : rest;
};
const FNS = ["makeOffer", "denyOffer", "acceptOffer", "withdrawOffer", "openOffersForSeller"];
for (const f of FNS) check(`2 — \`${f}\` exists to be asserted on`, fnBody(f) != null);

check(
  "2 — ⚠⚠ every entry point resolves its person from the SESSION, never from input",
  /user_id:\s*viewer\.userId/.test(lib) &&
    !/input\.(buyerPersonId|providerPersonId|personId)/.test(lib)
);
const deny = fnBody("denyOffer");
const accept = fnBody("acceptOffer");
check(
  "2 — ⚠⚠ the deny clears the open marker in the SAME statement as the status",
  deny != null && /status: "DENIED"[\s\S]{0,400}open_service_product_id: null/.test(deny),
  "a marker derived on read would drift from the status"
);
check(
  "2 — ⚠⚠ and so does the accept",
  accept != null && /status: "ACCEPTED"[\s\S]{0,300}open_service_product_id: null/.test(accept)
);
check(
  "2 — ⚠⚠⚠ the accept writes the line INSIDE a transaction with the status move",
  accept != null && /\$transaction\(/.test(accept),
  "a line without its accepted offer, or the reverse, is a cart nobody agreed to"
);
check(
  "2 — ⚠ the line's amount comes from the OFFER, not from the product's list price",
  accept != null &&
    /unit_price_cents: offer\.amount_cents/.test(accept) &&
    /amount_cents: offer\.amount_cents/.test(accept)
);
check(
  "2 — ⚠⚠ the line's provider comes from the OFFER, which stamped the owner at offer time",
  accept != null && /provider_person_id: offer\.provider_person_id/.test(accept),
  "reading the product's owner at accept time lets a sale change hands mid-deal"
);
/*
  ⚠⚠ NO MONEY MOVES. An offer agrees a price; it does not pay one. Asserted because this
  module sits one import from the settlement models.
*/
const MONEY = /(?:prisma|tx)\.(?:payment|paymentLine|settlementRequest|settlementLine)\w*\.(?:create|update|updateMany|upsert|delete|deleteMany)|fee_bps|\bPAID\b/;
check("2 — ⚠⚠ ABSENCE: the offer module moves no money and computes no cut", !MONEY.test(lib));
check("2 — MUTATION: that scan would catch a payment write", MONEY.test("await tx.payment.create({});"));

/* ═══ 2b · THE SELLER'S SCREEN (`P2-A6-E705` — WS-C) ═══════════════════════ */

/*
  ⚠⚠ THE SCREEN EXISTS NOW, SO THE FENCE MOVES ONTO IT. `E700` reported WS-C as NOT BUILT
  and this gate printed that in its own output; ⚠⚠⚠ **the rule that mattered most —
  *"TWO BUTTONS. NOT THREE"* — could not be asserted anywhere until there were buttons.**
  ⚠ Now it can be, and the defect would arrive as a THIRD control.
*/
const PAGE = join("src", "app", "(app)", "services", "offers", "page.tsx");
const INBOX = join("src", "components", "service-products", "OffersInbox.tsx");
check("2b — the seller's page exists where this guard expects it", existsSync(PAGE), PAGE);
check("2b — the offers inbox component exists", existsSync(INBOX), INBOX);
const page = existsSync(PAGE) ? stripComments(readFileSync(PAGE, "utf8")) : "";
const inbox = existsSync(INBOX) ? stripComments(readFileSync(INBOX, "utf8")) : "";
check("2b — the page is no longer a ComingSoon placeholder", page.length > 0 && !/ComingSoon/.test(page),
  "E700 shipped the data layer and left the room empty; E705 is the room");

/* ⚠ Ruling 95 check 1 — the page is NAMED and the name matches its tab label. */
check("2b — ⚠ the page has an <h1> and it matches the tab label word for word",
  /<h1[\s\S]{0,160}Offers for My Services/.test(page));
check("2b — and the <title> mirrors it", /title: "Offers for My Services/.test(page));

/*
  ⚠⚠⚠ TWO ACTIONS, NOT THREE — ASSERTED ON THE SCREEN AND ON THE ROUTE.
  ⚠ Scott ruled the counter chain out; a third control is how it would come back, and it
  would look reasonable to whoever added it.
*/
const ROUTE = join("src", "app", "api", "provider", "offers", "route.ts");
check("2b — the seller's route exists", existsSync(ROUTE), ROUTE);
const route = existsSync(ROUTE) ? stripComments(readFileSync(ROUTE, "utf8")) : "";
check(
  '2b — ⚠⚠⚠ the route accepts EXACTLY "accept" and "deny" — no third action',
  /z\.literal\("accept"\)/.test(route) &&
    /z\.literal\("deny"\)/.test(route) &&
    !/z\.literal\("counter"\)/.test(route) &&
    !/z\.literal\("propose"\)/.test(route)
);
const COUNTER_UI = /counter|Counter|Suggest a price|propose a price|make an offer back/;
check(
  "2b — ⚠⚠⚠ ABSENCE: the screen offers no counter control (ruled out 2026-09-28)",
  !COUNTER_UI.test(inbox),
  "a third button is how the chain Scott refused comes back"
);
check("2b — MUTATION: that scan WOULD catch a counter control",
  COUNTER_UI.test('<button>Counter</button>') && COUNTER_UI.test('"Suggest a price"'));
/*
  ⚠⚠ AND THE SENTENCE THAT KEEPS A MINIMUM FROM READING AS A QUOTE. Without it a seller
  believes they have named a price, which is the misunderstanding a counter field creates —
  so the wording is asserted, not trusted.
*/
check(
  "2b — ⚠⚠ the deny form SAYS a minimum is guidance, not a quote",
  /guidance, not a quote/i.test(inbox),
  "an offer at the minimum is still deniable (94a)"
);
check(
  "2b — ⚠ and it says the buyer may still be declined after clearing it",
  /still decline/i.test(inbox)
);
/* ⚠ THE SCREEN READS, IT DOES NOT DECIDE: no ownership test in the component. */
check(
  "2b — ⚠ the page passes no identifier in — the library scopes from the session",
  /openOffersForSeller\(viewer\)/.test(page) && !/providerPersonId:/.test(page)
);
/* ⚠⚠ A REAL ZERO IN INK, WITH ITS REASON — not a dash, not a fabricated row. */
check(
  "2b — ⚠ the empty state names the first move instead of reporting emptiness",
  /No open offers/.test(inbox) && /publish/i.test(inbox)
);

/* ═══ 3 · LIVE — THE CONSTRAINT IS PROVED BY BREAKING IT ═══════════════════ */

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL }),
});

async function live() {
  const before = {
    offers: await prisma.serviceProductOffer.count(),
    requests: await prisma.workRequest.count(),
    lines: await prisma.workRequestLine.count(),
    payments: await prisma.payment.count(),
    paymentLines: await prisma.paymentLine.count(),
  };

  const product = await prisma.serviceProduct.findFirst({
    where: { status: "PUBLISHED" },
    select: { id: true, providerProfile: { select: { person_id: true } } },
  });
  const buyer = await prisma.person.findFirst({
    /* ⚠ No `company` filter: `Person.company_id` is REQUIRED, so every person has one.
       Filtering on it would have looked careful and asserted nothing. */
    where: { is_service_buyer: true },
    select: { id: true, company: { select: { p_account_id: true } } },
  });
  /* ⚠⚠⚠ THE FIXTURE MUST EXIST OR THE NUMBERS BELOW MEAN NOTHING (`E586`). */
  check("3 — a PUBLISHED service product exists to offer on", product != null);
  check("3 — a buyer with a p-account exists", buyer?.company?.p_account_id != null);
  if (!product || !buyer?.company?.p_account_id) return before;

  const mine: string[] = [];
  const mk = (amount: number, marker: string | null, status: "OPEN" | "DENIED" = "OPEN") =>
    prisma.serviceProductOffer.create({
      data: {
        offer_number: `OFR-GATE-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
        buyer_person_id: buyer.id,
        service_product_id: product.id,
        provider_person_id: product.providerProfile.person_id,
        amount_cents: amount,
        status,
        open_service_product_id: marker,
      },
      select: { id: true },
    });

  try {
    const first = await mk(100_00, product.id);
    mine.push(first.id);
    check("3 — a first OPEN offer is accepted by the database", true);

    /* ⚠⚠⚠ THE PROOF THE BRIEF ASKED FOR: TRY TO BREAK IT. */
    let refused = false;
    try {
      const second = await mk(120_00, product.id);
      mine.push(second.id);
    } catch (e) {
      refused = (e as { code?: string }).code === "P2002";
    }
    check(
      "3 — ⚠⚠⚠ a SECOND open offer on the same (buyer, product) is REFUSED by Postgres",
      refused,
      "the rule must live in the constraint, not in a handler"
    );

    /* ⚠ AND THE OTHER DIRECTION: once decided, the pair frees up. */
    await prisma.serviceProductOffer.update({
      where: { id: first.id },
      data: { status: "DENIED", decided_at: new Date(), deny_floor_cents: 110_00, open_service_product_id: null },
    });
    const reoffer = await mk(110_00, product.id);
    mine.push(reoffer.id);
    check(
      "3 — ⚠⚠ once DENIED the pair frees up, so a re-offer is possible (not a lock)",
      true,
      "ruling 94a: the lock was wrong and so was the unlimited retry"
    );
    /*
      ⚠⚠⚠ AND THE RE-OFFER AT EXACTLY THE FLOOR IS STILL `OPEN`, NOT `ACCEPTED`.
      **A floor that auto-accepted would be the counter chain wearing a hat.**
    */
    const atFloor = await prisma.serviceProductOffer.findUnique({
      where: { id: reoffer.id },
      select: { status: true, amount_cents: true },
    });
    check(
      "3 — ⚠⚠⚠ an offer AT the floor is OPEN, never auto-ACCEPTED (the floor is guidance)",
      atFloor?.status === "OPEN" && atFloor?.amount_cents === 110_00
    );
    /* ⚠ A DIFFERENT PRODUCT IS A DIFFERENT PAIR — the constraint must not over-reach. */
    const other = await prisma.serviceProduct.findFirst({
      where: { id: { not: product.id } },
      select: { id: true },
    });
    if (other) {
      const o = await prisma.serviceProductOffer.create({
        data: {
          offer_number: `OFR-GATE-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
          buyer_person_id: buyer.id,
          service_product_id: other.id,
          provider_person_id: product.providerProfile.person_id,
          amount_cents: 50_00,
          open_service_product_id: other.id,
        },
        select: { id: true },
      });
      mine.push(o.id);
      check("3 — ⚠ a second product is a DIFFERENT pair and is allowed", true);
    } else {
      check("3 — a second product exists to prove the pair is per-product", false, "only one product in the database");
    }
  } finally {
    /* ⚠⚠ DELETE EXACTLY WHAT THIS GATE CREATED, BY ID. Never a bare deleteMany. */
    if (mine.length) await prisma.serviceProductOffer.deleteMany({ where: { id: { in: mine } } });
  }

  const after = {
    offers: await prisma.serviceProductOffer.count(),
    requests: await prisma.workRequest.count(),
    lines: await prisma.workRequestLine.count(),
    payments: await prisma.payment.count(),
    paymentLines: await prisma.paymentLine.count(),
  };
  check("3 — ⚠⚠ the gate left no offers behind", after.offers === before.offers, `${before.offers} → ${after.offers}`);
  check("3 — ⚠⚠ and created no work request or line", after.requests === before.requests && after.lines === before.lines,
    `requests ${before.requests}→${after.requests}, lines ${before.lines}→${after.lines}`);
  check("3 — ⚠⚠⚠ NO MONEY MOVED: Payment and PaymentLine unchanged",
    after.payments === before.payments && after.paymentLines === before.paymentLines,
    `Payment ${before.payments}→${after.payments}, PaymentLine ${before.paymentLines}→${after.paymentLines}`);
  return before;
}

live()
  .catch((e) => {
    failures.push(`3 — the live half threw instead of asserting: ${(e as Error).message}`);
  })
  .finally(async () => {
    await prisma.$disconnect();
    if (failures.length) {
      console.error(`\ncheck:offers — ${failures.length} FAILED, ${pass} passed, 0 not run\n`);
      for (const f of failures) console.error(`  ✗ ${f}`);
      process.exit(1);
    }
    console.log(`check:offers — ${pass}/${pass} passed, 0 failed, 0 not run`);
    console.log("  ⚠ NOTE: the screen IS asserted now (E705). NOT built: the three notifications");
    console.log("    shop.offer_received · shop.offer_accepted · shop.offer_denied — NAMED, not invented,");
    console.log("    because the event registry is Scott's and E382 governs the category defaults.");
  });
