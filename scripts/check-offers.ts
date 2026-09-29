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
/* ⚠ THE REAL WRITE PATH, CALLED FOR REAL (`P2-A6-E707`). Section 3b asserts the row's
   `person_id`, and only the function that writes it can prove that. */
import { notify } from "@/lib/notifications";

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

/* ═══ 4 · THE OFFER TELLS SOMEBODY (`P2-A6-E707`, 105d / 106a / 106b) ══════ */

/*
  ⚠⚠⚠ THIS SECTION EXISTS BECAUSE THE GATE USED TO PRINT *"NOT built: the three
  notifications"* IN ITS OWN OUTPUT. `E705` named them rather than inventing them; Scott
  ruled them on 2026-09-29 (`105d`) and `106e` corrected the mechanism — **his table names
  categories, and the work needs EVENTS mapped to categories.**

  ⚠⚠ **RULING 11 — THE RIGHT THING:** the defect this guards is not *"a notification is
  missing"*, it is ⚠⚠⚠ **A NOTIFICATION THAT WENT TO THE WRONG PARTY.** A buyer learning
  their own offer arrived, or a seller told their own offer was accepted, is worse than
  silence: it leaks the other side's position into the wrong inbox.
  ⚠ **SO EVERY ASSERTION HERE IS ABOUT IDENTITY, AND SECTION 3b PROVES IT AGAINST REAL
  ROWS — a count of 1 is satisfied by a row addressed to anybody** (`91`: the scope is the
  recipient, not the tally).
*/

const make = fnBody("makeOffer");
const EVENTS_EXPECTED = [
  "shop.offer_received",
  "shop.offer_accepted",
  "shop.offer_denied",
] as const;

const events = join("src", "lib", "notification-events.ts");
const cats = join("src", "lib", "notification-categories.ts");
check("4 — the event registry exists", existsSync(events), events);
check("4 — the category registry exists", existsSync(cats), cats);
const eventsSrc = existsSync(events) ? stripComments(readFileSync(events, "utf8")) : "";
const catsSrc = existsSync(cats) ? stripComments(readFileSync(cats, "utf8")) : "";
check("4 — stripping comments left the registries behind", eventsSrc.length > 400 && catsSrc.length > 400);

for (const e of EVENTS_EXPECTED) {
  check(`4 — \`${e}\` is declared in the event registry`, new RegExp(`"${e}":`).test(eventsSrc),
    "the registry may not invent rows, so event_behavior.md declares it too");
}
/*
  ⚠⚠ TWO CATEGORIES, NOT ONE, AND THE REASON IS `audience`. One event goes to the SELLER
  and two to the BUYER; `audience` is a single value per category, so one category could
  only carry both by becoming `"both"` — which shows *"Offers on your service products"* to
  every buyer who never published one. ⚠⚠⚠ **THAT IS THE DEFECT `E689(q)` MEASURED.**
*/
check(
  "4 — ⚠⚠ the seller's category exists and is `audience: seller`",
  /key: "service_product\.offers"[\s\S]{0,200}audience: "seller"/.test(catsSrc)
);
check(
  "4 — ⚠⚠ the buyer's category exists and is `audience: buyer`",
  /key: "buyer\.offers\.answered"[\s\S]{0,200}audience: "buyer"/.test(catsSrc)
);
check(
  "4 — ⚠ the seller event maps to the seller category",
  /"shop\.offer_received":[\s\S]{0,300}category: "service_product\.offers"/.test(eventsSrc)
);
check(
  "4 — ⚠ and BOTH buyer events map to the buyer category",
  /"shop\.offer_accepted":[\s\S]{0,300}category: "buyer\.offers\.answered"/.test(eventsSrc) &&
    /"shop\.offer_denied":[\s\S]{0,400}category: "buyer\.offers\.answered"/.test(eventsSrc)
);

/* ── ⚠⚠⚠ WHO IS TOLD, PER WRITER — THE HEART OF THIS SECTION ─────────────── */

check(
  "4 — ⚠⚠⚠ `makeOffer` tells the SELLER, using the owner stamped on the row",
  make != null &&
    /event: "shop\.offer_received"[\s\S]{0,200}personId: product\.providerProfile\.person_id/.test(make),
  "re-reading the product's owner later would re-point it at a seller who never saw the offer"
);
check(
  "4 — ⚠⚠⚠ `denyOffer` tells the BUYER, from the offer's own buyer id",
  deny != null && /event: "shop\.offer_denied"[\s\S]{0,200}personId: offer\.buyer_person_id/.test(deny)
);
check(
  "4 — ⚠⚠⚠ `acceptOffer` tells the BUYER, from the offer's own buyer id",
  accept != null && /event: "shop\.offer_accepted"[\s\S]{0,200}personId: offer\.buyer_person_id/.test(accept)
);
/*
  ⚠⚠⚠ THE ABSENCE THAT CATCHES THE CROSSED WIRE. A swap is the plausible defect — the two
  ids sit two lines apart in the same object and are both `String @db.Uuid`, so ⚠⚠ **THE
  WRONG ONE COMPILES** (`102c`, exactly the tangle item 6 was warned about).
*/
check(
  "4 — ⚠⚠⚠ ABSENCE: the SELLER is never the recipient of a buyer-facing offer event",
  !/event: "shop\.offer_(accepted|denied)"[\s\S]{0,200}personId: (?:offer\.)?provider_person_id/.test(lib) &&
    !/event: "shop\.offer_(accepted|denied)"[\s\S]{0,200}personId: product\.providerProfile\.person_id/.test(lib),
  "a seller told their own offer was accepted is the other side's position in the wrong inbox"
);
check(
  "4 — ⚠⚠⚠ ABSENCE: the BUYER is never the recipient of `shop.offer_received`",
  !/event: "shop\.offer_received"[\s\S]{0,200}personId: (?:offer\.)?buyer_person_id/.test(lib)
);
check(
  "4 — MUTATION: those two scans WOULD catch a crossed wire",
  /event: "shop\.offer_accepted"[\s\S]{0,200}personId: offer\.provider_person_id/.test(
    'event: "shop.offer_accepted",\n personId: offer.provider_person_id,'
  ) &&
    /event: "shop\.offer_received"[\s\S]{0,200}personId: (?:offer\.)?buyer_person_id/.test(
      'event: "shop.offer_received",\n personId: offer.buyer_person_id,'
    )
);

/* ── ⚠⚠⚠ ROW INSIDE, SEND OUTSIDE (`106a`) ──────────────────────────────── */

/*
  ⚠⚠ ONLY `acceptOffer` HAS A TRANSACTION TO BE IN (`106b`), and it is the one that
  matters: **it writes a cart line.** ⚠⚠⚠ A lost notification there leaves a commercial
  act unannounced.
*/
check(
  "4 — ⚠⚠⚠ the accept's bell row is written INSIDE the transaction — `tx` is passed",
  accept != null && /event: "shop\.offer_accepted"[\s\S]{0,400}\btx,/.test(accept),
  "ruling 86's `notification will ALWAYS add to the bell` is false if the row can be lost after a successful write"
);
check(
  "4 — ⚠⚠ and the SEND is run after the transaction returns, not inside it",
  accept != null &&
    /sendAfterCommit: bell\.sendAfterCommit/.test(accept) &&
    /\}\);[\s\S]{0,1200}if \(sendAfterCommit\) await sendAfterCommit\(\);/.test(accept),
  "a network call inside an open transaction holds a connection against somebody else's machine"
);
check(
  "4 — ⚠⚠⚠ the deferred send is CARRIED OUT of the transaction, never captured in a `let`",
  accept != null && /const \{ result, sendAfterCommit \} = await prisma\.\$transaction/.test(accept),
  "a variable assigned in a callback and read after it is the shape TypeScript cannot narrow — and the failure is a silently skipped email"
);
/*
  ⚠ AND THE TWO WITHOUT A TRANSACTION MUST NOT PRETEND TO HAVE ONE. Opening one purely to
  satisfy a brief's phrasing would add a mechanism to make a sentence true.
*/
check(
  "4 — ⚠ `makeOffer` and `denyOffer` pass NO `tx` — neither has a transaction (`106b`)",
  make != null && deny != null && !/\$transaction/.test(make) && !/\$transaction/.test(deny)
);

/* ── ⚠⚠⚠ THE DENIAL CARRIES THE FLOOR, AND SAYS IT IS NOT A QUOTE ───────── */

check(
  "4 — ⚠⚠⚠ the denial's notification carries the seller's message AND the floor",
  deny != null &&
    /event: "shop\.offer_denied"[\s\S]{0,400}denyMessage: message/.test(deny) &&
    /event: "shop\.offer_denied"[\s\S]{0,400}floor: floorCents != null/.test(deny),
  "the floor is the actionable part, and the buyer has no page to go and read it on"
);
check(
  "4 — ⚠ it passes the values that were WRITTEN, not the raw input",
  deny != null &&
    /deny_message: message/.test(deny) &&
    /deny_floor_cents: floorCents/.test(deny),
  "90b — the bell must never report a floor the record does not hold"
);
/*
  ⚠⚠⚠ RULING 94a, IN THE COPY. An offer AT the floor remains deniable, so the sentence
  that says so ships **in the same breath as the number**. ⚠ A buyer who reads the floor as
  a promise will feel cheated by a legitimate second denial — and that misreading is created
  by the gap between the figure and its caveat.
*/
const deniedEvent = (/"shop\.offer_denied":[\s\S]*?\n  \},/.exec(eventsSrc) ?? [""])[0];
check("4 — the denied event's declaration was found to assert on", deniedEvent.length > 200);
check(
  "4 — ⚠⚠⚠ the floor is called GUIDANCE, NOT A QUOTE, in the same string as the amount",
  /guidance, not a quote/.test(deniedEvent) && /clear it and can still be declined/.test(deniedEvent),
  "ruling 94a is a promise about behaviour; the copy is where a buyer meets it"
);
/*
  ⚠⚠ AND IT HAS NOWHERE TO SEND THEM, WHICH IS STATED RATHER THAN PAPERED OVER. `/shop` is
  a `ComingSoon` stub and no buyer-side offer surface exists — `makeOffer` is called from
  nowhere in `src/`. ⚠⚠⚠ A LINK TO EITHER WOULD BE `E579`: A LIVE DOOR ONTO A WALL.
*/
check(
  "4 — ⚠⚠ the denial's `href` is null on purpose — there is no buyer surface to open",
  /href: \(\) => null/.test(deniedEvent),
  "E579 — a door onto a wall spends the member's trust to show them nothing"
);
check(
  "4 — ⚠ and `/shop` really is still a stub, which is what makes that null correct",
  existsSync(join("src", "app", "(app)", "shop", "page.tsx")) &&
    /ComingSoon/.test(readFileSync(join("src", "app", "(app)", "shop", "page.tsx"), "utf8")),
  "if /shop has shipped, this null is now the defect and the href should point at it"
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
    /* ⚠⚠ COUNTED BOTH ENDS (`E707`): a notification probe that leaves rows behind is a
       seeded inbox, and `SentEmail` is how *"no real address was written to"* stops being
       a claim and becomes a measurement. */
    notifications: await prisma.notification.count(),
    sentEmails: await prisma.sentEmail.count(),
    prefs: await prisma.notificationPreference.count(),
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

  /* ═══ 3b · LIVE — WHO ACTUALLY GOT THE ROW (`P2-A6-E707`) ════════════════ */

  /*
    ⚠⚠⚠ **RECIPIENT ASSERTED BY IDENTITY, NOT BY COUNT.** The brief is explicit and the
    reason is that ⚠⚠ **a test which counts one notification passes when it went to the
    wrong person.** So every assertion below reads `person_id` off the row and compares it
    to the id that was supposed to receive it — and then checks the OTHER party has
    nothing.
    ⚠ Section 4 proved the source says the right thing. **This proves the row does.**
  */
  const sellerId = product.providerProfile.person_id;
  const buyerId = buyer.id;
  /*
    ⚠⚠⚠ THE GUARD THAT STOPS THIS BEING VACUOUS, AND IT IS THE `E603` WS-C LESSON
    VERBATIM: **two identical values agree.** If the seed's seller and buyer were the
    same person, every identity assertion below would pass while proving nothing at all.
  */
  check(
    "3b — ⚠⚠⚠ the seller and the buyer are DIFFERENT people — without this, identity proves nothing",
    sellerId !== buyerId,
    `seller ${sellerId} vs buyer ${buyerId} — two ones agree just as readily as two zeros`
  );

  const tag = Math.random().toString(36).slice(2, 10);
  const keys = {
    received: `e707-gate-received-${tag}`,
    accepted: `e707-gate-accepted-${tag}`,
    denied: `e707-gate-denied-${tag}`,
    bellOff: `e707-gate-belloff-${tag}`,
  };
  const SELLER_CATEGORY = "service_product.offers";
  /* ⚠ READ IT FIRST SO IT CAN BE PUT BACK EXACTLY (`E382` — never silently convert a
     choice a member made into a default). */
  const priorPref = await prisma.notificationPreference.findUnique({
    where: { person_id_category: { person_id: sellerId, category: SELLER_CATEGORY } },
    select: { in_app: true, email: true, sms: true },
  });

  try {
    if (sellerId !== buyerId) {
      /* ── the SELLER's event ─────────────────────────────────────────────── */
      await notify({
        event: "shop.offer_received",
        personId: sellerId,
        dedupeKey: keys.received,
        vars: { productTitle: "E707 probe", amount: "$100.00" },
      });
      const rcv = await prisma.notification.findFirst({
        where: { dedupe_key: keys.received },
        select: { person_id: true, category: true, requires_action: true, href: true, delivered_in_app_at: true },
      });
      check("3b — `shop.offer_received` wrote a row", rcv != null);
      check(
        "3b — ⚠⚠⚠ and it is addressed to the SELLER, by id",
        rcv?.person_id === sellerId,
        `person_id=${rcv?.person_id} expected ${sellerId}`
      );
      check(
        "3b — ⚠⚠⚠ ABSENCE: the BUYER received nothing for it",
        (await prisma.notification.count({
          where: { dedupe_key: keys.received, person_id: buyerId },
        })) === 0,
        "the other side's position must not land in the wrong inbox"
      );
      check("3b — ⚠ it files under the seller's category", rcv?.category === SELLER_CATEGORY);
      /* ⚠⚠ RULING 95 CHECK 4 — THE WORKLIST. Bell and worklist are one table, two views;
         `requires_action` is what puts a row on the second one. */
      check(
        "3b — ⚠⚠⚠ it reaches the WORKLIST, not only the bell — `requires_action` is true",
        rcv?.requires_action === true,
        "the seller must answer; a row they cannot act on is a bell with no worklist entry"
      );
      check(
        "3b — ⚠ and the worklist row has somewhere real to go",
        rcv?.href === "/services/offers",
        `href=${rcv?.href}`
      );

      /* ── the BUYER's accept ─────────────────────────────────────────────── */
      await notify({
        event: "shop.offer_accepted",
        personId: buyerId,
        dedupeKey: keys.accepted,
        vars: { productTitle: "E707 probe", amount: "$100.00", workRequestId: "abc-123" },
      });
      const acc = await prisma.notification.findFirst({
        where: { dedupe_key: keys.accepted },
        select: { person_id: true, category: true, href: true },
      });
      check(
        "3b — ⚠⚠⚠ `shop.offer_accepted` is addressed to the BUYER, by id",
        acc?.person_id === buyerId,
        `person_id=${acc?.person_id} expected ${buyerId}`
      );
      check(
        "3b — ⚠⚠⚠ ABSENCE: the SELLER received nothing for it",
        (await prisma.notification.count({
          where: { dedupe_key: keys.accepted, person_id: sellerId },
        })) === 0
      );
      check("3b — ⚠ it files under the buyer's category", acc?.category === "buyer.offers.answered");
      check(
        "3b — ⚠ and points at the buyer's own cart, which is a `WorkRequest`",
        acc?.href === "/work-requests/abc-123",
        `href=${acc?.href}`
      );

      /* ── the BUYER's denial, WITH THE FLOOR ─────────────────────────────── */
      await notify({
        event: "shop.offer_denied",
        personId: buyerId,
        dedupeKey: keys.denied,
        vars: { denyMessage: "Can't go that low on this one.", floor: "$1,000.00" },
      });
      const den = await prisma.notification.findFirst({
        where: { dedupe_key: keys.denied },
        select: { person_id: true, body: true, href: true },
      });
      check(
        "3b — ⚠⚠⚠ `shop.offer_denied` is addressed to the BUYER, by id",
        den?.person_id === buyerId,
        `person_id=${den?.person_id} expected ${buyerId}`
      );
      check(
        "3b — ⚠⚠⚠ ABSENCE: the SELLER received nothing for it",
        (await prisma.notification.count({
          where: { dedupe_key: keys.denied, person_id: sellerId },
        })) === 0
      );
      /*
        ⚠⚠⚠ THE STORED BODY IS WHERE THIS RULE IS EITHER KEPT OR BROKEN — asserting the
        source string would only prove the template, not the row a buyer will read.
      */
      check(
        "3b — ⚠⚠ the stored body carries the seller's own message",
        (den?.body ?? "").includes("Can't go that low on this one."),
        `body=${den?.body}`
      );
      check(
        "3b — ⚠⚠⚠ and the FLOOR, with `guidance, not a quote` in the same body",
        (den?.body ?? "").includes("$1,000.00") &&
          (den?.body ?? "").includes("guidance, not a quote"),
        "94a — an offer at the floor remains deniable, and the buyer meets that rule here or nowhere"
      );
      check(
        "3b — ⚠ the denial's href is null, because there is no buyer surface to open",
        den?.href === null,
        `href=${den?.href} — E579, a live door onto a wall`
      );

      /* ── ⚠⚠⚠ THE BELL IS WRITTEN EVEN WITH EMAIL OFF — PROVED BY TURNING IT OFF ── */
      /*
        ⚠ Ruling 86: *"notification will ALWAYS add to the bell, but will often create
        other types."* ⚠⚠ **EMAIL IS A CHANNEL; THE ROW IS THE RECORD.** Switching the
        channel off must not cost the member the entry.
      */
      await prisma.notificationPreference.upsert({
        where: { person_id_category: { person_id: sellerId, category: SELLER_CATEGORY } },
        update: { email: false, in_app: true },
        create: { person_id: sellerId, category: SELLER_CATEGORY, in_app: true, email: false, sms: false },
      });
      await notify({
        event: "shop.offer_received",
        personId: sellerId,
        dedupeKey: keys.bellOff,
        vars: { productTitle: "E707 probe", amount: "$100.00" },
      });
      const off = await prisma.notification.findFirst({
        where: { dedupe_key: keys.bellOff },
        select: { person_id: true, delivered_in_app_at: true, suppressed_reason: true, email_sent_at: true },
      });
      check("3b — ⚠⚠⚠ with EMAIL OFF the bell row is still written", off != null);
      check(
        "3b — ⚠⚠ and it is DELIVERED in app — the bell is not collateral of an email choice",
        off?.delivered_in_app_at != null,
        `delivered_in_app_at=${off?.delivered_in_app_at}`
      );
      check(
        "3b — ⚠ with no suppression reason, because in-app was never switched off",
        off?.suppressed_reason === null,
        `suppressed_reason=${off?.suppressed_reason}`
      );
      check(
        "3b — ⚠⚠ and no email was claimed for it",
        off?.email_sent_at === null,
        "email_sent_at is an atomic claim; a stamp here would mean a send nobody asked for"
      );
    } else {
      check("3b — the identity assertions ran", false, "seller and buyer are the same person; refusing to assert vacuously");
    }
  } finally {
    /*
      ⚠⚠ SCOPED TEARDOWN, BY dedupe_key, `deleteMany` NEVER `delete` — a teardown that can
      throw can hide the result it was protecting.
      ⚠⚠⚠ AND THE PREFERENCE IS RESTORED TO WHAT IT WAS, not deleted: if the seller had a
      row before this gate ran, deleting it would convert a choice they made into a default
      (`E382`).
    */
    await prisma.notification.deleteMany({ where: { dedupe_key: { in: Object.values(keys) } } });
    if (priorPref) {
      await prisma.notificationPreference.update({
        where: { person_id_category: { person_id: sellerId, category: SELLER_CATEGORY } },
        data: priorPref,
      });
    } else {
      await prisma.notificationPreference.deleteMany({
        where: { person_id: sellerId, category: SELLER_CATEGORY },
      });
    }
  }

  const after = {
    offers: await prisma.serviceProductOffer.count(),
    requests: await prisma.workRequest.count(),
    lines: await prisma.workRequestLine.count(),
    payments: await prisma.payment.count(),
    paymentLines: await prisma.paymentLine.count(),
    notifications: await prisma.notification.count(),
    sentEmails: await prisma.sentEmail.count(),
    prefs: await prisma.notificationPreference.count(),
  };
  check(
    "3b — ⚠⚠ the notification probe left NO rows behind",
    after.notifications === before.notifications,
    `Notification ${before.notifications} → ${after.notifications}`
  );
  /*
    ⚠⚠⚠ THE ONE THAT MATTERS MOST ON A SHARED DATABASE (ruling 38): **NO REAL ADDRESS WAS
    WRITTEN TO.** A send would have left a `SentEmail` receipt (`E522` — the transport
    records even a refusal), so an unchanged count is the measurement, not the claim.
    ⚠ Two independent reasons it could not send: `shop.*` is not on `NOTIFICATION_EMAIL_EVENTS`,
    and `MAIL_CAPTURE=1`. **This asserts the outcome rather than trusting either.**
  */
  check(
    "3b — ⚠⚠⚠ NO MAIL WENT: `SentEmail` unchanged, counted both ends",
    after.sentEmails === before.sentEmails,
    `SentEmail ${before.sentEmails} → ${after.sentEmails}`
  );
  check(
    "3b — ⚠⚠ and no notification preference was left behind",
    after.prefs === before.prefs,
    `NotificationPreference ${before.prefs} → ${after.prefs} — a row here is a member's recorded intent`
  );
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
    /*
      ⚠⚠ THE NOTE MOVES WITH THE BUILD. It said the three notifications were NOT BUILT; they
      are built, so repeating that would be a gate lying in its own output.
      ⚠ SUPERSEDED, quoted not deleted (`E164`):
      //   ⚠ NOTE: the screen IS asserted now (E705). NOT built: the three notifications
      //   shop.offer_received · shop.offer_accepted · shop.offer_denied — NAMED, not invented,
      //   because the event registry is Scott's and E382 governs the category defaults.
    */
    console.log("  ⚠ NOTE: the three notifications ARE built and asserted by identity (E707, 105d/106a).");
    console.log("    STILL NOT BUILT, and it is the buyer's whole half: `makeOffer` is called from");
    console.log("    NOWHERE in src/ — there is no buyer-side offer surface, so `shop.offer_received`");
    console.log("    is wired and CANNOT FIRE, and `shop.offer_denied` has no href to give (E579).");
    console.log("    Email: `shop.*` is NOT on NOTIFICATION_EMAIL_EVENTS, so all three record intent");
    console.log("    and do not send. Adding a key there is a product decision, not a refactor.");
  });
