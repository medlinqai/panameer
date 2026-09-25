import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { prisma } from "@/lib/prisma";

/**
 * ── ⚠⚠⚠ `check:work-chain` (`P2-A8-E621` WS-E) ──────────────────────────
 *
 * ⚠ THE STOP GATE: *"the derived writer table; every mutation result; the
 * dash→count list for the whole brief."*
 *
 * ⚠⚠ EVERYTHING HERE IS **DERIVED AT RUN TIME FROM THE SCHEMA AND THE SOURCE**
 * (`E587`), never from a list typed into this file. A named list of states would
 * go stale the day somebody adds one — and the state nobody remembered to add is
 * exactly the one with no writer.
 *
 * ── ⚠⚠⚠ TWO DERIVATION BUGS WERE MEASURED AND FIXED BEFORE THIS GATE EXISTED,
 * AND BOTH ARE RECORDED BECAUSE EITHER WOULD HAVE MADE IT LIE ──────────────
 *
 * ⚠⚠ **(1) A PLAIN TEXT SEARCH ATTRIBUTES WRITES TO THE WRONG MODEL.** Grepping
 * `status: "DRAFT"` across `src/` returns SEVEN files — including
 * `learn-assessment.ts`, which writes a `LearnAssessment`. Reported as
 * *"WorkRequest.DRAFT has 7 writers"* that is a confident falsehood of the same
 * family as the gate that once asserted the right rule about the wrong file.
 * ⚠⚠⚠ **SO EVERY WRITE IS MATCHED INSIDE A `prisma.<model>.<write>(…)` CALL**,
 * whose argument list is found by COUNTING PARENTHESES rather than by a regex
 * window — a window that stops short reports a real write as absent.
 *
 * ⚠⚠ **(2) `///` DOC COMMENTS PARSE AS ENUM VALUES.** Splitting an enum body on
 * newlines yields *"/// ⚠ Out for sourcing — visible to sellers"* as a value,
 * which then reports as UNWRITTEN — **a fabricated state, reported as a gap.**
 * Values are therefore filtered to `/^[A-Z][A-Z0-9_]*$/`.
 *
 * ⚠⚠⚠ **AND A THIRD, WHICH IS WHY `UNWRITTEN` IS A QUALIFIED CLAIM HERE:** a
 * write of the form `data: { status: how }` — a VARIABLE — is invisible to a
 * literal match. `closeInterview` does exactly that for `DECLINED`/`CANCELLED`.
 * **So a model with ANY dynamic status write cannot have its values called
 * unwritten**, and this gate says so rather than guessing.
 */
let pass = 0;
const fails: string[] = [];
const notes: string[] = [];
const check = (name: string, ok: boolean, why = "") => {
  if (ok) pass += 1;
  else fails.push(`${name}${why ? ` — ${why}` : ""}`);
};

const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
function walk(d: string, o: string[] = []): string[] {
  for (const e of readdirSync(d)) {
    if (e === "node_modules" || e === ".next" || e.startsWith(".")) continue;
    const f = join(d, e);
    if (statSync(f).isDirectory()) walk(f, o);
    else if (/\.tsx?$/.test(f)) o.push(relative(".", f));
  }
  return o;
}

/**
 * ⚠⚠ THE CALL'S ARGUMENT LIST, BY COUNTING PARENTHESES from the opening one.
 * ⚠ A fixed character window is what makes a long `create` look like it writes
 * nothing — and "writes nothing" is the answer this whole gate turns on.
 */
function callBody(code: string, openParen: number): string {
  let depth = 0;
  for (let i = openParen; i < code.length; i++) {
    if (code[i] === "(") depth++;
    else if (code[i] === ")") {
      depth--;
      if (depth === 0) return code.slice(openParen, i + 1);
    }
  }
  return code.slice(openParen);
}

const SCHEMA = readFileSync(join("prisma", "schema.prisma"), "utf8");
const SRC = walk("src").map((f) => ({ f, code: strip(readFileSync(f, "utf8")) }));
const LIB = join("src", "lib");

type StateRow = {
  model: string;
  enumName: string;
  value: string;
  writers: string[];
  /** ⚠ True when the model has a non-literal status write somewhere. */
  modelHasDynamicWrite: boolean;
};

function buildWriterTable(): { rows: StateRow[]; models: string[]; writeCalls: number } {
  const models = [...SCHEMA.matchAll(/model (\w+) \{([\s\S]*?)\n\}/g)];
  /*
    ⚠⚠⚠ THE CHAIN IS DERIVED BY SHAPE, NOT NAMED: any model carrying a
    `work_request_id` or a `work_order_id`, plus the two heads. ⚠ A hard-coded
    list of eight models would miss the ninth the day somebody adds it.
  */
  const chain = models
    .filter(([, , body]) => /\n\s+work_request_id\s/.test(body) || /\n\s+work_order_id\s/.test(body))
    .map(([, n]) => n);
  for (const head of ["WorkRequest", "WorkOrder"]) if (!chain.includes(head)) chain.push(head);

  const rows: StateRow[] = [];
  let writeCalls = 0;
  for (const [, model, body] of models) {
    if (!chain.includes(model)) continue;
    const statusField = body.match(/\n\s+status\s+(\w+)/);
    if (!statusField) continue;
    const enumBody = SCHEMA.match(new RegExp(`enum ${statusField[1]} \\{([^}]*)\\}`));
    if (!enumBody) continue;
    /* ⚠⚠ VALUES ONLY — a `///` doc line is not a state. */
    const values = enumBody[1]
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => /^[A-Z][A-Z0-9_]*$/.test(s));

    const camel = model[0]!.toLowerCase() + model.slice(1);
    const calls: { f: string; body: string }[] = [];
    for (const { f, code } of SRC) {
      const re = new RegExp(
        `\\b[a-zA-Z_$]+\\.${camel}\\.(create|createMany|update|updateMany|upsert)\\s*\\(`,
        "g"
      );
      for (const m of code.matchAll(re)) {
        calls.push({ f, body: callBody(code, m.index! + m[0].length - 1) });
      }
    }
    writeCalls += calls.length;

    /* ⚠⚠⚠ `status: <identifier>` IS A DYNAMIC WRITE. ⚠ `status: {` is a FILTER
       in a `where` clause, not a write, and must not be counted as either. */
    const modelHasDynamicWrite = calls.some((c) =>
      /status:\s*(?!["'{])[A-Za-z_$]/.test(c.body)
    );

    for (const value of values) {
      const writers = [
        ...new Set(
          calls.filter((c) => new RegExp(`status:\\s*"${value}"`).test(c.body)).map((c) => c.f)
        ),
      ].sort();
      rows.push({ model, enumName: statusField[1]!, value, writers, modelHasDynamicWrite });
    }
  }
  return { rows, models: chain.sort(), writeCalls };
}

async function main() {
  /* ═══ 1 · ⚠⚠⚠ THE DERIVED WRITER TABLE (item 1) ══════════════════════════ */
  const { rows, models, writeCalls } = buildWriterTable();

  /* ⚠⚠ A GATE WITH NO INPUTS MUST FAIL (`E586`). Three populations, each
     counted, because any one of them silently empty would make every assertion
     below pass by asserting nothing. */
  check("1 — the source scan has a population (E586)", SRC.length > 200, `${SRC.length} files`);
  check("1 — the chain was derived and is not empty (E586)", models.length >= 8, `${models.length}: ${models.join(", ")}`);
  check("1 — the writer table has rows (E586)", rows.length >= 30, `${rows.length} states`);
  check("1 — and real write calls were found (E586)", writeCalls >= 20, `${writeCalls}`);

  /* ⚠ THE TABLE ITSELF — printed, because the stop gate asks for it. */
  console.log("\n  ── THE DERIVED WRITER TABLE ──");
  let lastModel = "";
  for (const r of rows) {
    if (r.model !== lastModel) {
      console.log(`\n  ${r.model}.status → ${r.enumName}`);
      lastModel = r.model;
    }
    const w =
      r.writers.length === 0
        ? r.modelHasDynamicWrite
          ? "— no LITERAL writer (this model has a dynamic write — not a gap)"
          : "— UNWRITTEN"
        : `${r.writers.length}  ${r.writers.map((x) => x.replace(`src${join("/")}`, "")).join("  ")}`;
    console.log(`    ${r.value.padEnd(15)} ${w}`);
  }
  console.log("");

  /* ── ⚠⚠⚠ EVERY STATE WRITE LIVES IN `src/lib` ────────────────────────────
     ⚠ This is what *"exactly one writer"* is enforceable as: a state moved from
     a component or a route handler is a second writer by definition, because the
     rule that guards it lives in the library. ⚠⚠ Owner-scoping, ordering and
     idempotency are all in `lib`; a page that sets a status has none of them. */
  const outsideLib = rows.filter((r) => r.writers.some((w) => !w.startsWith(LIB)));
  check(
    "1 — ⚠⚠⚠ every state in the chain is written from `src/lib` and nowhere else",
    outsideLib.length === 0,
    outsideLib
      .map((r) => `${r.model}.${r.value} ← ${r.writers.filter((w) => !w.startsWith(LIB)).join(", ")}`)
      .join(" · ")
  );

  /* ── ⚠⚠ THE STATES THIS BRIEF DID NOT BUILD STILL REPORT (item 1) ──────── */
  const unwritten = rows.filter((r) => r.writers.length === 0 && !r.modelHasDynamicWrite);
  notes.push(
    `${unwritten.length} states have no writer and are REPORTED, not failed: ` +
      unwritten.map((r) => `${r.model}.${r.value}`).join(", ")
  );
  /* ⚠⚠⚠ AND AN UNWRITTEN STATE IS NOT A FAILURE — it is the honest answer. The
     assertion is that the table CAN report one, which a table with everything
     written could not demonstrate. */
  check(
    "1 — ⚠⚠ the table distinguishes written from unwritten states",
    unwritten.length > 0 && rows.some((r) => r.writers.length > 0),
    "a table where every state looks the same is not measuring anything"
  );

  /* ── ⚠⚠⚠ RULING 43: `RELEASED` HAS EXACTLY ONE WRITER ───────────────────
     ⚠ It is the one state in the chain with **no human presser**, so a second
     writer is not a style problem — it is a second way for a contract to come
     into force. */
  const released = rows.find((r) => r.model === "WorkOrder" && r.value === "RELEASED");
  check(
    "1 — ⚠⚠⚠ RELEASED has EXACTLY ONE writer (ruling 43)",
    released != null && released.writers.length === 1,
    `${released?.writers.join(", ") ?? "not found"} — a second writer is a second way for a contract to take effect`
  );
  check(
    "1 — ⚠⚠ and that writer is `orders.ts`, where the second acceptance lands",
    released?.writers[0] === join("src", "lib", "orders.ts"),
    released?.writers.join(", ")
  );

  /* ── ⚠⚠⚠ RULING 25: NOTHING WRITES `PAID` ───────────────────────────────── */
  const paid = rows.find((r) => r.value === "PAID");
  check(
    "1 — ⚠⚠⚠ PAID has NO writer, literal or dynamic (ruling 25)",
    paid != null && paid.writers.length === 0 && !paid.modelHasDynamicWrite,
    `${paid?.writers.join(", ")} dynamic=${paid?.modelHasDynamicWrite}`
  );

  /* ═══ 2 · ⚠⚠⚠ THE SAVINGS FIGURE CANNOT REACH A PROVIDER (item 2) ═════════
     ⚠ DERIVED, not a list of known sites: any identifier that looks like a
     savings or roadmap-value figure, anywhere in `src/`. ⚠⚠ The roadmap's number
     is Panameer's estimate of what a fix is worth, and **any provider who sees it
     prices against it.** */
  /*
    ⚠⚠⚠ THIS PATTERN'S FIRST VERSION FAILED ITS OWN MUTATION, AND THE REASON IS
    WORTH KEEPING. It was:
    //   /\b(estimated_?[Ss]avings|savings_?(estimate|cents|amount)|roadmapValue|opportunity_?value)\b/
    ⚠ A trailing `\b` after the alternation means `estimated_savings_cents` does
    **NOT** match — `_` is a word character, so there is no boundary there.
    ⚠⚠ MEASURED: adding `estimated_savings_cents Int?` to `schema.prisma`
    produced **no failure at all**.
    ⚠⚠⚠ AND THE IN-GATE MUTATION CHECK BELOW PASSED ANYWAY, because it tested
    `estimatedSavings` — a DIFFERENT SPELLING that did match. **The assertion's
    own proof was satisfied by a neighbour** (`E607`: it is not enough that the
    mutation lands; the assertion under test must be the thing that catches it).
    ⚠ So the boundary is now leading-only, the stem is what is matched, and the
    mutation check tests the SNAKE_CASE form the schema would actually use.
  */
  const SAVINGS =
    /\b(estimated[_-]?savings|savings[_-]?(estimate|cents|amount)|roadmap[_-]?value|opportunity[_-]?value)/i;
  const leaks = SRC.filter((s) => SAVINGS.test(s.code)).map((s) => s.f);
  check(
    "2 — ⚠⚠⚠ no savings or roadmap-value figure exists anywhere in src/",
    leaks.length === 0,
    leaks.join(", ")
  );
  /* ⚠⚠⚠ EVERY SPELLING A LEAK COULD REALISTICALLY WEAR, INCLUDING THE SNAKE_CASE
     COLUMN THE FIRST VERSION OF THIS PATTERN MISSED. */
  for (const spelling of [
    "estimated_savings_cents Int?",
    "const estimatedSavings = 265000;",
    "select: { savings_cents: true }",
    "estimatedSavingsCents: number",
    "roadmap_value",
    "opportunityValue",
  ]) {
    check(`2 — MUTATION: the sweep catches \`${spelling.slice(0, 28)}\``, SAVINGS.test(spelling));
  }
  /* ⚠⚠ AND THE FOUR PROVIDER-FACING WRITERS CARRY NO SUCH FIELD, asserted by
     NAME because these are the payloads the brief names — invite, proposal,
     interview, work order. */
  for (const w of ["work-request-invite.ts", "proposals.ts", "interviews.ts", "work-orders.ts"]) {
    const f = SRC.find((s) => s.f === join(LIB, w));
    check(`2 — ⚠ ${w} names no savings figure`, f != null && !SAVINGS.test(f.code), w);
  }
  /* ⚠⚠⚠ AND THE SCHEMA HOLDS NO SUCH COLUMN, so there is nothing to leak. */
  check(
    "2 — ⚠⚠ and the schema has no savings column at all",
    !SAVINGS.test(SCHEMA),
    "the constraint is a rule to PRESERVE, not a leak to close"
  );

  /* ═══ 3 · ⚠⚠ ROUTE A AND ROUTE B — ONE REQUISITION WRITER (item 3) ═══════
     ⚠ `check:selection` walks both routes and compares the two rows BY SHAPE.
     ⚠⚠ What is asserted HERE is the structural reason that comparison keeps
     passing: there is ONE line writer, so the two routes cannot drift apart
     between runs of that gate. */
  const sel = SRC.find((s) => s.f === join(LIB, "selection.ts"));
  check(
    "3 — ⚠⚠⚠ exactly ONE function upserts a requisition line",
    sel != null && (sel.code.match(/workRequestLine\.upsert/g) ?? []).length === 1,
    "two upserts is how Route A and Route B start producing different shapes"
  );
  check(
    "3 — ⚠ and both routes call it",
    sel != null && (sel.code.match(/writeRequisitionLine\(/g) ?? []).length === 3,
    "one definition plus two callers"
  );
  /* ⚠⚠ AND THERE IS NO SECOND REQUISITION HEADER — the cart IS the work request. */
  check(
    "3 — ⚠⚠⚠ no Requisition model exists",
    !/^model Requisition/m.test(SCHEMA),
    "requisition_model_2026-09-21.md maps Requisition header → WR_HEADER"
  );

  /* ═══ 4 · ⚠⚠⚠ NOTHING DOWNSTREAM BRANCHES ON THE DOOR (item 4) ══════════
     ⚠ Over LOGIC — `src/lib` and `src/app/api`. ⚠⚠ The SCREEN must show the
     origin (`E388`'s doctrine: Panameer may only RECORD the existence of an order
     it did not generate), so sweeping the components would fail on correct code. */
  const LOGIC = SRC.filter(
    (s) => s.f.startsWith(LIB) || s.f.startsWith(join("src", "app", "api"))
  );
  check("4 — the logic sweep has a population (E586)", LOGIC.length > 20, `${LOGIC.length}`);
  const ORIGIN_BRANCH =
    /(origin|\.origin)\s*(===|!==)\s*["'](DIRECT|INDIRECT)["']|["'](DIRECT|INDIRECT)["']\s*(===|!==)/i;
  const branchers = LOGIC.filter((s) => ORIGIN_BRANCH.test(s.code)).map((s) => s.f);
  check(
    "4 — ⚠⚠⚠ ABSENCE: no rule compares a work order's origin",
    branchers.length === 0,
    `${branchers.join(", ")} — "nothing downstream may know which fired"`
  );
  check(
    "4 — MUTATION: the sweep would catch a rule that did",
    ORIGIN_BRANCH.test('if (order.origin === "DIRECT") return [];')
  );
  /* ⚠⚠ AND THE ONE FIELD THAT DIFFERS IS SET IN ONE PLACE — the shared body's
     caller, so a third door cannot invent a third origin quietly. */
  const wo = SRC.find((s) => s.f === join(LIB, "work-orders.ts"));
  check(
    "4 — ⚠⚠ both doors pass `origin` into ONE shared builder",
    wo != null &&
      (wo.code.match(/buildWorkOrder\(/g) ?? []).length === 3 &&
      (wo.code.match(/workOrder\.create\(/g) ?? []).length === 1,
    "one create call, two callers"
  );

  /* ═══ 5 · ⚠⚠⚠ EVERY FIGURE THAT BECAME A COUNT IS SCOPED (item 5) ════════
     ⚠⚠ *"Scope is asserted, never inferred from an empty result."* That defect
     has appeared three times in this codebase — most recently an unscoped
     `workOrder.count()` that presented the whole platform's total as one
     member's figure, and read as correct only because the table was empty. */
  const stats = SRC.find((s) => s.f === join(LIB, "statistics.ts"));
  check("5 — statistics.ts was found", stats != null);
  if (stats) {
    /* ⚠⚠⚠ DERIVED: every `count(` in the file must carry a `where`. A count
       without one is by definition platform-wide. */
    const counts = [...stats.code.matchAll(/\.count\s*\(/g)];
    check("5 — the count sweep has a population (E586)", counts.length >= 3, `${counts.length}`);
    const unscoped = counts.filter((m) => {
      const body = callBody(stats.code, m.index! + m[0].length - 1);
      return !/where\s*:/.test(body);
    });
    check(
      "5 — ⚠⚠⚠ every count on Statistics carries a `where`",
      unscoped.length === 0,
      `${unscoped.length} unscoped — an unscoped count presents the platform's total as one member's figure`
    );
    /* ⚠⚠ AND THE THREE FIGURES THIS BRIEF TURNED INTO COUNTS ARE SCOPED TO THE
       PERSON, asserted by reading their own call rather than by trusting the
       sweep above — the neighbour-matching trap (`E607`). */
    for (const [figure, needle] of [
      ["workOrders", /workOrders: await prisma\.workOrder\.count\(\{\s*where: \{ provider_person_id: personId \}/],
      ["proposalsSent", /countWindowed\(window, "submitted_at", "providerBid", \{\s*provider_person_id: personId/],
      ["interviews", /countWindowed\(window, "created_at", "interviewRequest", \{\s*provider_person_id: personId/],
    ] as const) {
      check(
        `5 — ⚠⚠ ${figure} is scoped to this person, in its own call`,
        needle.test(stats.code),
        "asserted at the call, not inferred from the file"
      );
    }
  }

  /* ═══ 6 · ⚠⚠⚠ NO MONEY MOVED (item 7) ═══════════════════════════════════ */
  const payments = await prisma.payment.count();
  check("6 — ⚠⚠ no Payment row exists anywhere", payments === 0, `${payments}`);
  const paidWriters = SRC.filter((s) => /status:\s*"PAID"/.test(s.code)).map((s) => s.f);
  check("6 — ⚠⚠⚠ nothing anywhere writes PAID", paidWriters.length === 0, paidWriters.join(", "));
  const paymentCreators = SRC.filter((s) =>
    /\b[a-zA-Z_$]+\.payment\.(create|createMany|upsert)\b/.test(s.code)
  ).map((s) => s.f);
  check("6 — ⚠⚠⚠ nothing creates a Payment", paymentCreators.length === 0, paymentCreators.join(", "));
  /* ⚠ AND NO CUT IS COMPUTED. `fee_bps` is a rate stated on a contract; a
     multiplication against it is a cut, and that is out of scope entirely. */
  const cutters = SRC.filter((s) => /fee_bps\s*[*/]|[*/]\s*fee_bps|feeBps\s*[*/]|[*/]\s*feeBps/.test(s.code)).map(
    (s) => s.f
  );
  check(
    "6 — ⚠⚠⚠ nothing multiplies or divides by the fee — no cut is computed",
    cutters.length === 0,
    cutters.join(", ")
  );

  /* ═══ 7 · ⚠⚠ THE DASH→COUNT LIST FOR THE WHOLE BRIEF ════════════════════
     ⚠ Read off the live view model, so the list in the report is measured rather
     than remembered. */
  const { getStatistics } = await import("@/lib/statistics");
  const person = await prisma.person.findFirst({
    where: { NOT: { user_id: null } },
    select: { id: true, user_id: true },
  });
  if (!person?.user_id) {
    check("7 — a person exists to read Statistics for (E586)", false, "none found");
  } else {
    const profile = await prisma.providerProfile.findFirst({
      where: { person_id: person.id },
      select: { id: true },
    });
    const s = await getStatistics(person.id, person.user_id, profile?.id ?? null, "all");
    const w = (s as { work: Record<string, unknown> }).work;
    const counted: string[] = [];
    const dashed: string[] = [];
    for (const [k, v] of Object.entries(w)) {
      if (typeof v === "number") counted.push(k);
      else if (v && typeof v === "object" && "uncounted" in (v as object)) dashed.push(k);
    }
    console.log(`  ── DASH→COUNT ──\n  counted: ${counted.join(", ")}\n  dashed:  ${dashed.join(", ")}\n`);
    check("7 — the Work figures were read (E586)", counted.length + dashed.length >= 5);
    for (const f of ["proposalsSent", "interviews", "interviewsTaken", "interviewsDeclined", "workOrders"]) {
      check(`7 — ⚠⚠⚠ ${f} is a COUNT`, counted.includes(f), `${JSON.stringify(w[f])}`);
    }
    /* ⚠⚠⚠ AND EARNINGS IS STILL A DASH. Nothing writes `PAID`; a count here
       would claim a mechanism that does not exist. */
    check("7 — ⚠⚠⚠ earnings is STILL a dash", dashed.includes("earnings"), `${JSON.stringify(w.earnings)}`);
    /* ⚠⚠ EVERY DASH CARRIES ITS REASON — a dash without one cannot be printed,
       and the reason must name the MECHANISM rather than the member. */
    for (const d of dashed) {
      const reason = (w[d] as { uncounted?: string }).uncounted ?? "";
      check(`7 — ⚠ the ${d} dash carries a reason`, reason.length > 10, reason);
      check(
        `7 — ⚠⚠ and the ${d} reason names the mechanism, not the member`,
        !/\byou\b|\byour\b/i.test(reason),
        reason
      );
    }
  }
}

async function report() {
  try {
    await main();
  } catch (e) {
    fails.push(`the gate itself threw — ${(e as Error).message}`);
  }
  await prisma.$disconnect().catch(() => {});
  for (const n of notes) console.log(`  · ${n}\n`);
  console.log(`check:work-chain — ${fails.length ? `${fails.length} FAILED, ` : ""}${pass} passed`);
  for (const f of fails) console.log(`\n  ✗ ${f}`);
  if (pass < 35) {
    console.log(`\n  ✗ E586 — only ${pass} assertions ran; this gate has ~50`);
    process.exit(1);
  }
  if (fails.length) process.exit(1);
}

report();
