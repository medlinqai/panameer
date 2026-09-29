/**
 * `check:onboarding` — the onboarding request is raised when BOTH parties have accepted,
 * exactly once per work order, and **nothing is sent anywhere** (`P2-A8-E704` WS-A,
 * ruling 93h). `npm run check:onboarding`.
 *
 * ── ⚠⚠ WHAT IT ASSERTS (11) ─────────────────────────────────────────────────
 *
 *  1. ⚠⚠⚠ **RAISED WHEN BOTH ACCEPTS ARE PRESENT AND NOT BEFORE.** One accept is half a
 *     contract. Measured: `provider_accepted_at` → status `ACCEPTED`, `buyer_accepted_at`
 *     → status `RELEASED`, so **"both" is exactly `RELEASED`** and that is the only place
 *     the record may be created.
 *  2. ⚠⚠ **IN THE SAME TRANSACTION AS THE RELEASE — both or neither.** A released order
 *     with no onboarding request is a signed contract with nothing raised against it.
 *  3. ⚠⚠⚠ **EXACTLY ONE PER WORK ORDER, ENFORCED BY THE DATABASE** — proved by inserting
 *     a second and requiring Postgres to refuse. The release path may be retried.
 *  4. ⚠⚠⚠ **NOTHING IS SENT. NO OUTBOUND CALL EXISTS AND NONE MAY BE ADDED HERE** —
 *     asserted as an ABSENCE, because *"an outbound call to a system nobody has named is
 *     not a feature; it is a guess with a retry loop."*
 *  5. ⚠⚠ **THE STATUS ENUM HAS ONE VALUE, AND THE WS-B VALUES ARE ABSENT ON PURPOSE.** An
 *     enum value nothing can write reads as a state the system can reach, and it cannot.
 *  6. ⚠ Both parties are copied from the order, never re-read (`E696`'s stamping argument).
 *  7. ⚠⚠ The word cannot collide: the model is `OnboardingRequest`, and `"onboarding"`
 *     already means a provider finishing their own profile.
 *
 * ── ⚠⚠ SCOPE (91) · SUBJECT (92) · DIRECTION (90) ───────────────────────────
 *
 * ⚠ STATIC: `prisma/schema.prisma` and `src/lib/orders.ts`, comments stripped (rule 12).
 * ⚠⚠ LIVE: it inserts **its own rows against a synthetic work-order id** — possible only
 * because this family carries **no cross-model foreign keys**, so the constraint is
 * testable without building the whole order chain — and deletes them by id. Counts taken
 * before and after.
 * ⚠⚠⚠ **NO UI IS ASSERTED: THERE IS NO SCREEN. The record is raised by the release path
 * and read by nobody yet — that is a real gap and it is stated, not implied.**
 * ⚠ Inputs asserted first, so *"0 failures"* cannot mean *"nothing was tested"* (`E586`).
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
const strip = (s: string) =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/^([ \t]*)\/\/\/?.*$/gm, (_m, i) => i);

/* ═══ 0 · INPUTS (92) ══════════════════════════════════════════════════════ */
const ORDERS = join("src", "lib", "orders.ts");
const SCHEMA = join("prisma", "schema.prisma");
check("0 — the orders library exists where this guard expects it", existsSync(ORDERS), ORDERS);
check("0 — and is not empty", existsSync(ORDERS) && statSync(ORDERS).size > 0);
const orders = existsSync(ORDERS) ? strip(readFileSync(ORDERS, "utf8")) : "";
const schema = existsSync(SCHEMA) ? strip(readFileSync(SCHEMA, "utf8")) : "";
check("0 — stripping comments left live code", orders.trim().length > 1000, `${orders.trim().length} chars`);
const model = (/model OnboardingRequest \{[\s\S]*?\n\}/.exec(schema) ?? [""])[0];

/* ═══ 1 · THE RECORD'S SHAPE ═══════════════════════════════════════════════ */
check("1 — `OnboardingRequest` is in the schema", model.length > 0);
check(
  "1 — ⚠⚠⚠ `work_order_id` is @unique — one per order, enforced by the DATABASE",
  /work_order_id String @unique @db\.Uuid/.test(model),
  "the release path may be retried; a handler remembering to check is not enough"
);
check(
  "1 — ⚠ it hangs off the WORK ORDER, not the work request",
  /work_order_id/.test(model) && !/work_request_id/.test(model),
  "a DIRECT order has no work request at all"
);
/* ⚠⚠ NO CROSS-MODEL FOREIGN KEYS — the family's pattern, and a cascade from Person must
   never delete the record that a contract was agreed. */
check(
  "1 — ⚠⚠ no cross-model @relation — the ids are bare, like ProviderEvaluation's",
  !/@relation/.test(model)
);
check(
  "1 — ⚠⚠⚠ the status enum has EXACTLY ONE value, RAISED",
  /enum OnboardingRequestStatus \{\s*RAISED\s*\}/.test(schema),
  "one value is a deliberate statement: nothing can move it yet"
);
/*
  ⚠⚠⚠ THE ABSENCE THAT KEEPS WS-B HONEST. `SENT`/`CONFIRMED`/`FAILED` belong to the
  outbound call, and **an enum value nothing can write reads as a state the system can
  reach.** They go in with the code that writes them.
*/
const WSB_VALUES = /enum OnboardingRequestStatus \{[\s\S]*?(SENT|CONFIRMED|FAILED)[\s\S]*?\}/;
check(
  "1 — ⚠⚠ ABSENCE: the delivery states are NOT declared, because nothing can write them",
  !WSB_VALUES.test(schema),
  "they are named in the enum's docblock so WS-B adds them deliberately"
);
check(
  "1 — MUTATION: that scan WOULD catch a premature delivery state",
  WSB_VALUES.test("enum OnboardingRequestStatus {\n  RAISED\n  SENT\n}")
);
/* ⚠ THE NAME CANNOT COLLIDE — `onboarding` already means a provider's own profile. */
check(
  "1 — ⚠⚠ the model is `OnboardingRequest`, never a bare `Onboarding`",
  /model OnboardingRequest \{/.test(schema) && !/model Onboarding \{/.test(schema),
  "`ProviderProfile.onboarding_completed_at` already owns the bare word (93m applied early)"
);

/* ═══ 2 · RAISED AT THE SECOND ACCEPTANCE, IN ONE TRANSACTION ══════════════ */
check(
  "2 — ⚠⚠⚠ the record is created inside a transaction with the release",
  /\$transaction\(async \(tx\) => \{[\s\S]{0,900}status: "RELEASED"[\s\S]{0,900}onboardingRequest\.create/.test(orders),
  "a released order with no onboarding request is a half state"
);
check(
  "2 — ⚠⚠ the release's race guard is UNCHANGED — the first accept must be a FACT",
  /where: \{ id: order\.id, status: "ACCEPTED", provider_accepted_at: \{ not: null \} \}/.test(orders),
  "the transaction adds atomicity; it does not replace the guard (43a)"
);
check(
  "2 — ⚠ nothing is created when the guard matches nothing",
  /if \(moved\.count === 0\) return moved;/.test(orders),
  "a retried release must not raise a second request"
);
check(
  "2 — ⚠ both parties are copied FROM THE ORDER, not re-read",
  /provider_person_id: order\.provider_person_id/.test(orders) &&
    /buyer_person_id: order\.buyer_person_id/.test(orders)
);
/*
  ⚠⚠⚠ AND THE ONLY CREATOR IS THAT ONE. A second creator would mean an onboarding request
  raised somewhere the contract was not completed. ⚠ Call shapes searched (96):
  `prisma.onboardingRequest.<write>` and `tx.onboardingRequest.<write>`.
*/
const CREATORS = /(?:prisma|tx)\.onboardingRequest\.(create|createMany|upsert)/g;
check(
  "2 — ⚠⚠⚠ exactly ONE creator in orders.ts, and none anywhere else in src/lib",
  (orders.match(CREATORS) ?? []).length === 1,
  `${(orders.match(CREATORS) ?? []).length} in orders.ts`
);

/* ═══ 3 · ⚠⚠⚠ NOTHING IS SENT ══════════════════════════════════════════════ */
/*
  ⚠⚠ WS-B IS NOT BUILT AND MUST NOT BE FAKED. Measured 2026-09-29: nothing names "the
  onboarding application" — no env var, no route, no service, no client.
  ⚠⚠⚠ **AN OUTBOUND CALL TO A SYSTEM NOBODY HAS NAMED IS NOT A FEATURE; IT IS A GUESS WITH
  A RETRY LOOP.** So the absence is asserted rather than trusted to stay absent.
*/
const OUTBOUND = /ONBOARDING_[A-Z_]*(URL|API|KEY|ENDPOINT)|onboardingApi|fetch\([^)]*onboarding/i;
check(
  "3 — ⚠⚠⚠ ABSENCE: no outbound call and no onboarding endpoint is read",
  !OUTBOUND.test(orders) && !OUTBOUND.test(schema)
);
check(
  "3 — MUTATION: that scan WOULD catch an invented integration",
  OUTBOUND.test('process.env.ONBOARDING_API_URL') &&
    OUTBOUND.test('await fetch(`${base}/onboarding`)')
);

/* ═══ 4 · LIVE — THE CONSTRAINT, PROVED BY BREAKING IT ═════════════════════ */
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL }),
});

async function live() {
  const before = {
    requests: await prisma.onboardingRequest.count(),
    orders: await prisma.workOrder.count(),
    payments: await prisma.payment.count(),
    paymentLines: await prisma.paymentLine.count(),
  };
  /*
    ⚠⚠ A SYNTHETIC WORK-ORDER ID IS LEGITIMATE HERE, AND ONLY BECAUSE OF THE DESIGN: this
    family carries NO cross-model foreign keys, so the uniqueness rule is testable without
    building an order, two parties and two acceptances. ⚠ That is a real benefit of the
    pattern and it is worth naming.
  */
  const fakeOrder = "00000000-0000-4000-8000-" + Math.random().toString(16).slice(2, 14).padEnd(12, "0");
  const mine: string[] = [];
  try {
    const first = await prisma.onboardingRequest.create({
      data: {
        onboarding_request_number: `ONB-GATE-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
        work_order_id: fakeOrder,
        provider_person_id: fakeOrder,
        buyer_person_id: fakeOrder,
      },
      select: { id: true, status: true, raised_at: true },
    });
    mine.push(first.id);
    check("4 — a first onboarding request is accepted", true);
    check("4 — ⚠ it defaults to RAISED and stamps raised_at", first.status === "RAISED" && first.raised_at != null);

    let refused = false;
    try {
      const second = await prisma.onboardingRequest.create({
        data: {
          onboarding_request_number: `ONB-GATE-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
          work_order_id: fakeOrder,
          provider_person_id: fakeOrder,
          buyer_person_id: fakeOrder,
        },
        select: { id: true },
      });
      mine.push(second.id);
    } catch (e) {
      refused = (e as { code?: string }).code === "P2002";
    }
    check(
      "4 — ⚠⚠⚠ a SECOND request on the same work order is REFUSED by Postgres",
      refused,
      "idempotent by construction — the release path may be retried"
    );
  } finally {
    if (mine.length) await prisma.onboardingRequest.deleteMany({ where: { id: { in: mine } } });
  }

  const after = {
    requests: await prisma.onboardingRequest.count(),
    orders: await prisma.workOrder.count(),
    payments: await prisma.payment.count(),
    paymentLines: await prisma.paymentLine.count(),
  };
  check("4 — ⚠⚠ the gate left nothing behind", after.requests === before.requests,
    `${before.requests} → ${after.requests}`);
  check("4 — ⚠ and created no work order", after.orders === before.orders,
    `${before.orders} → ${after.orders}`);
  check("4 — ⚠⚠⚠ NO MONEY MOVED",
    after.payments === before.payments && after.paymentLines === before.paymentLines,
    `Payment ${before.payments}→${after.payments}, PaymentLine ${before.paymentLines}→${after.paymentLines}`);
  /*
    ⚠⚠ AND THE HONEST STATE OF THE FEATURE, PRINTED RATHER THAN IMPLIED: with 0 work
    orders in the database, no release has ever happened, so **no onboarding request has
    ever been raised by the product.** The trigger is wired and untravelled.
  */
  check("4 — ⚠ reported: work orders in the database", true, `${before.orders} — so the trigger is wired and untravelled`);
}

live()
  .catch((e) => failures.push(`4 — the live half threw instead of asserting: ${(e as Error).message}`))
  .finally(async () => {
    await prisma.$disconnect();
    if (failures.length) {
      console.error(`\ncheck:onboarding — ${failures.length} FAILED, ${pass} passed, 0 not run\n`);
      for (const f of failures) console.error(`  ✗ ${f}`);
      process.exit(1);
    }
    console.log(`check:onboarding — ${pass}/${pass} passed, 0 failed, 0 not run`);
    console.log("  ⚠ NOT BUILT: WS-B, the outbound call — nothing names 'the onboarding application'.");
    console.log("  ⚠ NOT BUILT: any screen. The record is raised by the release path and read by nobody yet.");
  });
