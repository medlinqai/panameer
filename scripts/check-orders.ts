/**
 * `check:orders` — the rules the work-order surfaces cannot be allowed to lose
 * (`P1-J4-E393`). `npm run check:orders`.
 *
 * ── ⚠⚠ THE THREE THINGS THIS BRIEF SAID IN CAPITALS ─────────────────────────
 *
 *   1. **A BUYER MUST NEVER SEE "ACCEPT"; A PROVIDER MUST NEVER SEE "RELEASE."**
 *      Asserted EXHAUSTIVELY — every status × every party — and structurally, so
 *      neither string can reach the DOM by another path.
 *   2. **DO NOT RENDER A PART-DRAWN AMOUNT LINE — IT CANNOT EXIST.** Asserted at
 *      the TYPE level: the AMOUNT variant has no field that could express one.
 *   3. **`origin` DIRECT vs INDIRECT MUST BE VISIBLE**, and a direct order must
 *      not imply a work request behind it.
 *
 * ⚠ PLUS THE DOCTRINE CHECK THE BRIEF ASKED FOR. `lib/nav.ts` carries the
 * work-order doctrine and predates `E388`'s model. **They agree**, and the
 * agreement is asserted rather than assumed — if a later edit makes them
 * disagree, this goes red instead of somebody quietly choosing one.
 *
 * ⚠ NO DATABASE AND NO BROWSER.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { availableActions, activationMessage, drawdownFor, partyFor, termChanges, type OrderParty } from "@/lib/orders";
import { ROUTE_ACCESS } from "@/lib/route-access";
import { PROVIDER_NAV, REQUESTER_NAV } from "@/lib/nav";

let pass = 0;
const failures: string[] = [];
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) pass += 1;
  else failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
};

const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

type SourceFile = { path: string; text: string; code: string };
function walk(dir: string, out: SourceFile[] = []): SourceFile[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry)) {
      const text = readFileSync(full, "utf8");
      out.push({ path: relative(".", full), text, code: stripComments(text) });
    }
  }
  return out;
}
const SRC = walk("src");
const fileAt = (p: string) => SRC.find((f) => f.path === join(...p.split("/")));

/* ═══ 1 · THE TWO-SIDED ACTIVATION — EXHAUSTIVE OVER STATUS × PARTY ════════
   ⚠⚠ Not a sample. EVERY combination, so there is no state anybody has to argue
   about. 7 statuses × 3 parties = 21 cases, each asserted three ways. */

const STATUSES = [
  "DRAFT",
  "ISSUED",
  "ACCEPTED",
  "RELEASED",
  "ACTIVE",
  "CLOSED",
  "CANCELLED",
] as const;
const PARTIES: OrderParty[] = ["BUYER", "PROVIDER", "NONE"];

let combos = 0;
for (const status of STATUSES) {
  for (const party of PARTIES) {
    combos += 1;
    const actions = availableActions({ status }, party);

    /* ⚠⚠ THE TWO RULES THE BRIEF PUT IN CAPITALS. */
    check(
      `1 — ${party} @ ${status}: a BUYER never gets ACCEPT`,
      !(party === "BUYER" && actions.includes("ACCEPT")),
      `got [${actions.join(",")}]`
    );
    check(
      `1 — ${party} @ ${status}: a PROVIDER never gets RELEASE`,
      !(party === "PROVIDER" && actions.includes("RELEASE")),
      `got [${actions.join(",")}]`
    );
    /* ⚠ AND A NON-PARTY GETS NOTHING, EVER. `NONE` is the safe default and every
       branch must fall through to it rather than into an else. */
    check(
      `1 — ${party} @ ${status}: a NON-PARTY gets no action at all`,
      !(party === "NONE" && actions.length > 0),
      `got [${actions.join(",")}]`
    );
    /* ⚠ AT MOST ONE ACTION IS EVER OFFERED. Two buttons would mean the two events
       had been collapsed into one screen decision. */
    check(`1 — ${party} @ ${status}: at most one action`, actions.length <= 1);
  }
}
check("1 — every status × party combination was exercised", combos === 21, `${combos}`);

/* The positive half — the gate must also ALLOW the two legal moves, or it is
   passing by refusing everything. */
check(
  "1 — the PROVIDER can accept an ISSUED order",
  availableActions({ status: "ISSUED" }, "PROVIDER").join() === "ACCEPT"
);
check(
  "1 — the BUYER can release an ACCEPTED order",
  availableActions({ status: "ACCEPTED" }, "BUYER").join() === "RELEASE"
);
/* ⚠⚠ THE ORDER OF THE TWO EVENTS, ASSERTED. A buyer cannot release something the
   provider has not accepted — that is the collapse the brief forbids. */
check(
  "1 — the BUYER cannot release an ISSUED order (the provider has not accepted)",
  availableActions({ status: "ISSUED" }, "BUYER").length === 0
);
check(
  "1 — the PROVIDER cannot accept twice (ACCEPTED offers them nothing)",
  availableActions({ status: "ACCEPTED" }, "PROVIDER").length === 0
);
check(
  "1 — a RELEASED order offers nobody anything",
  availableActions({ status: "RELEASED" }, "BUYER").length === 0 &&
    availableActions({ status: "RELEASED" }, "PROVIDER").length === 0
);

/* The party itself is derived from the session, and a stranger is NONE. */
const ORDER = { buyer_person_id: "buyer-1", provider_person_id: "prov-1" };
check("1 — the buyer resolves to BUYER", partyFor(ORDER, "buyer-1") === "BUYER");
check("1 — the provider resolves to PROVIDER", partyFor(ORDER, "prov-1") === "PROVIDER");
check("1 — a stranger resolves to NONE", partyFor(ORDER, "someone-else") === "NONE");
/* ⚠ AN EMPTY PERSON ID MUST NOT MATCH AN EMPTY COLUMN. That is the shape where a
   missing session silently becomes a party. */
check("1 — an empty person id is NONE", partyFor(ORDER, "") === "NONE");
check(
  "1 — an empty person id is NONE even against empty columns",
  partyFor({ buyer_person_id: "", provider_person_id: "" }, "") === "NONE"
);

/* ⚠ The message is party-aware too — "waiting for the provider" must not be
   shown TO the provider. */
check(
  "1 — ISSUED tells the provider to act and the buyer to wait",
  activationMessage("ISSUED", "PROVIDER").includes("accept") &&
    activationMessage("ISSUED", "BUYER").toLowerCase().includes("waiting")
);
check(
  "1 — ACCEPTED tells the buyer to act and the provider to wait",
  activationMessage("ACCEPTED", "BUYER").toLowerCase().includes("release") &&
    activationMessage("ACCEPTED", "PROVIDER").toLowerCase().includes("waiting")
);

/**
 * ⚠⚠ STRUCTURAL: NEITHER LABEL CAN REACH THE DOM BY ANOTHER PATH.
 *
 * The exhaustive table above proves the FUNCTION is right. This proves the UI
 * cannot go around it — the strings live once each, inside `OrderActivation`'s
 * `LABEL` map, and that component takes an `actions` array and no party flag, so
 * there is no expression in it that could evaluate to "show Accept to a buyer".
 */
{
  const act = fileAt("src/components/orders/OrderActivation.tsx");
  check("1 — the activation component exists", !!act);
  check(
    "1 — ABSENCE: it never learns who is looking",
    !!act && !/\bparty\b|isBuyer|isProvider|getSessionViewer|useSession/.test(act.code)
  );
  check(
    "1 — the buttons are rendered ONLY by mapping the server's actions",
    !!act && /actions\.map\(/.test(act.code)
  );
  /* ⚠ ONE OCCURRENCE EACH, IN THE LABEL MAP. */
  check(
    "1 — 'Accept' appears exactly once in the component",
    (act?.code.match(/Accept/g) ?? []).length === 1
  );
  check(
    "1 — 'Release' appears exactly once in the component",
    (act?.code.match(/Release/g) ?? []).length === 1
  );
}
/* ⚠⚠ AND NOWHERE ELSE IN THE ORDERS SURFACES. A second Accept button on the
   detail page would bypass every assertion above. */
{
  const surfaces = SRC.filter(
    (f) =>
      (f.path.includes(join("app", "(app)", "orders")) ||
        f.path.includes(join("components", "orders"))) &&
      f.path !== join("src", "components", "orders", "OrderActivation.tsx")
  );
  check("1 — the orders surfaces were found", surfaces.length >= 3, `${surfaces.length}`);
  const leaks = surfaces.filter((f) => /["'>]\s*(Accept|Release)\b/.test(f.code));
  check(
    "1 — ABSENCE: no Accept/Release label outside the activation component",
    leaks.length === 0,
    leaks.map((l) => l.path).join(", ")
  );
}
/* ⚠ THE API REFUSES OUT OF THE SAME FUNCTION — the button is the courtesy. */
{
  const lib = fileAt("src/lib/orders.ts");
  check(
    "1 — acceptOrder asks availableActions rather than re-testing the party",
    !!lib && /availableActions\(order, party\)\.includes\("ACCEPT"\)/.test(lib.code)
  );
  check(
    "1 — releaseOrder asks availableActions too",
    !!lib && /availableActions\(order, party\)\.includes\("RELEASE"\)/.test(lib.code)
  );
  /* ⚠ AND THE WRITE IS CONDITIONAL ON THE STATUS IT READ, so two clicks race to
     one winner instead of stamping the timestamp twice. */
  check(
    "1 — accept writes only from ISSUED",
    !!lib && /where: \{ id: order\.id, status: "ISSUED" \}/.test(lib.code)
  );
  check(
    "1 — release writes only from ACCEPTED",
    !!lib && /where: \{ id: order\.id, status: "ACCEPTED" \}/.test(lib.code)
  );
  check("1 — there are exactly two activation writes", (lib?.code.match(/workOrder\.updateMany/g) ?? []).length === 2);
}

/* ═══ 2 · THE DRAWDOWN — AN AMOUNT LINE CANNOT BE PART-DRAWN ═══════════════ */

{
  const d = drawdownFor({
    basis: "RATE",
    uom: "HOUR",
    quantity: 160,
    unit_price_cents: 15000,
    drawn_quantity: 40,
    drawn_amount_cents: 600000,
  });
  check("2 — a RATE line reports ordered/drawn/remaining", d.basis === "RATE");
  if (d.basis === "RATE") {
    check("2 — RATE remaining quantity is ordered minus drawn", d.remainingQuantity === 120);
    check("2 — RATE ordered value is quantity × unit price", d.orderedCents === 2400000);
    check("2 — RATE remaining value is ordered minus drawn", d.remainingCents === 1800000);
    check("2 — RATE percent is drawn over ordered", d.percent === 25);
  }
}
{
  /* ⚠ CLAMPED. The spine refuses an overdraw, so a negative remainder is a data
     fault — "-8 hours remaining" invites somebody to treat it as a number. */
  const d = drawdownFor({ basis: "RATE", quantity: 10, unit_price_cents: 100, drawn_quantity: 18, drawn_amount_cents: 1800 });
  if (d.basis === "RATE") {
    check("2 — an over-drawn RATE line clamps remaining at zero", d.remainingQuantity === 0);
    check("2 — and clamps the percentage at 100", d.percent === 100);
    check("2 — and clamps remaining value at zero", d.remainingCents === 0);
  }
}
{
  const undrawn = drawdownFor({ basis: "AMOUNT", amount_cents: 2400000, drawn_amount_cents: 0 });
  const drawn = drawdownFor({ basis: "AMOUNT", amount_cents: 2400000, drawn_amount_cents: 2400000 });
  check("2 — an undrawn AMOUNT line is not drawn", undrawn.basis === "AMOUNT" && !undrawn.drawn);
  check("2 — a drawn AMOUNT line is drawn", drawn.basis === "AMOUNT" && drawn.drawn);
  /* ⚠⚠ THE TYPE IS THE ENFORCEMENT. The AMOUNT variant carries NO quantity, NO
     remaining and NO percent — so a half-full bar is not merely "not rendered",
     it cannot be expressed. */
  for (const forbidden of ["percent", "remainingQuantity", "remainingCents", "orderedQuantity"]) {
    check(
      `2 — ABSENCE: an AMOUNT drawdown has no ${forbidden}`,
      !(forbidden in (undrawn as Record<string, unknown>))
    );
  }
  /* ⚠ THE IMPOSSIBLE STATE IS FLAGGED, NOT DRAWN. */
  const partial = drawdownFor({ basis: "AMOUNT", amount_cents: 2400000, drawn_amount_cents: 900000 });
  check(
    "2 — a partial AMOUNT draw is flagged inconsistent",
    partial.basis === "AMOUNT" && partial.inconsistent
  );
  check(
    "2 — a full AMOUNT draw is NOT flagged",
    drawn.basis === "AMOUNT" && !drawn.inconsistent
  );
  check(
    "2 — an undrawn AMOUNT line is NOT flagged",
    undrawn.basis === "AMOUNT" && !undrawn.inconsistent
  );
}
/* ⚠ AND THE PAGE HAS NO PROGRESS BAR IN THE AMOUNT BRANCH. */
{
  const page = fileAt("src/app/(app)/orders/[id]/page.tsx");
  check("2 — the detail page exists", !!page);
  check(
    "2 — the progress bar is inside the RATE branch only",
    !!page && (page.code.match(/role="progressbar"/g) ?? []).length === 1
  );
  check(
    "2 — the page branches on the drawdown basis",
    !!page && /d\.basis === "RATE"/.test(page.code)
  );
  check(
    "2 — the inconsistent state is rendered as a warning, not as progress",
    !!page && /d\.inconsistent/.test(page.code)
  );
}

/* ═══ 3 · ORIGIN IS VISIBLE, AND DIRECT IMPLIES NO WORK REQUEST ════════════ */

{
  const chrome = fileAt("src/components/orders/OrderChrome.tsx");
  check("3 — the origin badge exists", !!chrome && /OriginBadge/.test(chrome.code));
  check(
    "3 — DIRECT is what gets badged (the exception, not the default)",
    !!chrome && /origin !== "DIRECT"/.test(chrome.code)
  );
  const list = fileAt("src/app/(app)/orders/page.tsx");
  const detail = fileAt("src/app/(app)/orders/[id]/page.tsx");
  check("3 — the list renders the origin badge", !!list && /OriginBadge/.test(list.code));
  check("3 — the detail renders the origin badge", !!detail && /OriginBadge/.test(detail.code));
  /* ⚠⚠ THE ROW MUST NOT IMPLY A WORK REQUEST BEHIND A DIRECT ORDER. The
     back-link is rendered only when `workRequestId` genuinely exists. */
  check(
    "3 — the list's work-request link is conditional on there being one",
    !!list && /o\.workRequestId \?/.test(list.code)
  );
  check(
    "3 — the detail's work-request link is conditional too",
    !!detail && /o\.workRequestId &&/.test(detail.code)
  );
  check(
    "3 — a DIRECT order explains itself in words, not only a badge",
    !!detail && /o\.origin === "DIRECT"/.test(detail.code)
  );
}

/* ═══ 4 · THE DELTA — SUBSTANTIATED, AND HONEST ABOUT WHAT IT COMPARES ═════ */

const REQ = {
  basis: "RATE" as const,
  uom: "HOUR",
  quantity: 160,
  unit_price_cents: 15000,
  amount_cents: null,
  service_start: new Date("2026-10-01"),
  service_end: new Date("2026-12-31"),
};
check("4 — identical terms produce no changes", termChanges({ ...REQ }, { ...REQ }).length === 0);
{
  /* ⚠ THE CASE THE BRIEF NAMES: *"ERP approvers cut quantities and shorten
     dates — that is what approval IS."* */
  const cut = termChanges(
    { ...REQ, quantity: 100, service_end: new Date("2026-11-30") },
    { ...REQ }
  );
  check("4 — a cut quantity and a shortened date are both reported", cut.length === 2);
  check("4 — the quantity change says was 160 now 100", cut.some((c) => c.field === "Quantity" && c.was === "160" && c.now === "100"));
  check("4 — the date change names the end date", cut.some((c) => c.field === "Ends" && c.was === "2026-12-31"));
}
check(
  "4 — a changed rate is reported in currency, not cents",
  termChanges({ ...REQ, unit_price_cents: 12500 }, { ...REQ }).some(
    (c) => c.field === "Rate" && c.was === "150.00" && c.now === "125.00"
  )
);
/* ⚠⚠ NO ORIGIN LINE MEANS NO DIFF — NOT AN EMPTY ONE. A DIRECT order has nothing
   behind it, and an empty "nothing changed" would imply a comparison was made. */
check("4 — no originating line produces no changes", termChanges({ ...REQ }, null).length === 0);
{
  const detail = fileAt("src/app/(app)/orders/[id]/page.tsx");
  check(
    "4 — the diff renders only when something actually changed",
    !!detail && /o\.hasChanges &&/.test(detail.code)
  );
  /* ⚠⚠ AND THE HEADING SAYS WHAT IS BEING COMPARED. `WorkOrderLine` has NO link
     to `ProviderBidLine`, so an order-versus-BID diff cannot be computed and the
     UI must not imply one. */
  check(
    "4 — the UI names the work request as the comparison, not the bid",
    !!detail && /work-request line this order came from/.test(detail.text)
  );
  check(
    "4 — ABSENCE: the diff never claims to compare against a bid",
    !!detail && !/what you bid|against the bid|your bid/i.test(detail.text)
  );
}
/* ⚠ THE MISSING LINK, ASSERTED — so the day somebody adds it, this goes red and
   the report above is revisited rather than left stale. */
{
  const schema = readFileSync(join("prisma", "schema.prisma"), "utf8")
    .replace(/^\s*\/\/\/.*$/gm, "")
    .replace(/^\s*\/\/.*$/gm, "");
  const woLine = schema.match(/^model WorkOrderLine \{([\s\S]*?)^\}/m)?.[1] ?? "";
  const wo = schema.match(/^model WorkOrder \{([\s\S]*?)^\}/m)?.[1] ?? "";
  check("4 — WorkOrderLine was found", woLine.length > 0);
  check(
    "4 — WorkOrderLine names its originating work-request line (the diff's source)",
    /work_request_line_id/.test(woLine)
  );
  check(
    "4 — STILL TRUE: no link from a work order to the bid it was awarded from",
    !/bid/i.test(woLine) && !/bid/i.test(wo)
  );
}

/* ═══ 5 · ROUTES, SCOPES AND THE DOCTRINE ═════════════════════════════════ */

const gated = new Map(ROUTE_ACCESS.map((e) => [e.prefix, e.requires]));
check("5 — /orders is gated `authenticated`", gated.get("/orders") === "authenticated");
{
  const proxy = fileAt("src/proxy.ts");
  check("5 — proxy.ts runs the edge on /orders", !!proxy && proxy.text.includes('"/orders/:path*"'));
}
/* ⚠⚠ BOTH RAILS POINT AT IT — which is WHY the gate is `authenticated` and not a
   capability. A capability on either side would refuse the other. */
{
  const buyerItem = REQUESTER_NAV.find((i) => i.href === "/orders");
  const providerItem = PROVIDER_NAV.find((i) => i.href === "/orders");
  check("5 — the buyer rail offers /orders", !!buyerItem);
  check("5 — the provider rail offers /orders", !!providerItem);
  check("5 — both rails call the journey Work Orders", buyerItem?.heading === "Work Orders" && providerItem?.heading === "Work Orders");
}
for (const p of ["src/app/(app)/orders/page.tsx", "src/app/(app)/orders/[id]/page.tsx"]) {
  const f = fileAt(p);
  check(`5 — ${p.split("/").slice(-2).join("/")} calls guardPage`, !!f && /guardPage\(/.test(f.code));
}
/* ⚠ ONE PAGE, TWO SCOPES — asserted as the OR, and asserted NOT to be two routes. */
{
  const lib = fileAt("src/lib/orders.ts");
  check(
    "5 — the list resolves both scopes in one query",
    !!lib && /OR: \[\{ buyer_person_id: personId \}, \{ provider_person_id: personId \}\]/.test(lib.code)
  );
  check(
    "5 — the person id comes from the session, never from input",
    !!lib && /where: \{ user_id: viewer\.userId \}/.test(lib.code)
  );
  const routes = SRC.filter((f) => f.path.includes(join("app", "(app)", "orders")) && f.path.endsWith("page.tsx"));
  check("5 — there are exactly two orders pages, not one per side", routes.length === 2, routes.map((r) => r.path).join(", "));
}
/**
 * ⚠⚠ THE DOCTRINE CHECK THE BRIEF ASKED FOR. `lib/nav.ts` carries the work-order
 * doctrine and predates `E388`'s model. They AGREE — the doctrine asked for an
 * origin field to arrive WITH the model, and it did. Asserted so a later edit
 * that breaks the agreement goes red rather than being quietly chosen between.
 */
{
  const nav = fileAt("src/lib/nav.ts");
  const schema = readFileSync(join("prisma", "schema.prisma"), "utf8");
  /* ⚠ ONE NORMALISED HAYSTACK, ONE TEST EACH. An assertion with an `||` fallback
     that is almost always true is worse than no assertion: it reports green
     while measuring nothing. */
  const navFlat = (nav?.text ?? "").replace(/\s+/g, " ");
  const schemaFlat = schema.replace(/\s+/g, " ");
  check(
    "5 — the doctrine still says a work order must know its origin",
    navFlat.includes("A WORK ORDER MUST KNOW ITS ORIGIN")
  );
  check(
    "5 — the doctrine still defines a DIRECT work order as struck elsewhere",
    navFlat.includes("A Direct Work Order has no Panameer-side origin")
  );
  check(
    "5 — and E388's model carries the field the doctrine asked for",
    /origin WorkOrderOrigin/.test(schemaFlat)
  );
  check(
    "5 — the enum is exactly the two values the doctrine names",
    /enum WorkOrderOrigin \{ DIRECT INDIRECT \}/.test(schemaFlat)
  );
  /* ⚠⚠ THE ToS IS THE MSA AND THE WORK ORDER IS THE SOW — SO THERE IS NO THIRD
     CONTRACT. `E380` retired the word; nothing here may bring it back. */
  check("5 — ABSENCE: no Contract model", !/^model Contract /m.test(schema));
  const contractRoutes = SRC.filter((f) => /["'`]\/contracts/.test(f.code));
  check(
    "5 — ABSENCE: no /contracts route is referenced",
    contractRoutes.length === 0,
    contractRoutes.map((c) => c.path).join(", ")
  );
}

/* ═══ REPORT ══════════════════════════════════════════════════════════════ */

if (failures.length) {
  console.error(`\ncheck:orders — ${failures.length} FAILED, ${pass} passed\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`check:orders — ${pass}/${pass} passed`);
