/**
 * `check:nav-reachable` — a nav entry and the page it points at agree about who
 * is allowed there (`P2-J1.1-E046` WS-4). `npm run check:nav-reachable`.
 *
 * ── ⚠⚠ FIVE OCCURRENCES OF ONE BUG CLASS, ALL RECORDED IN `route-access.ts` ──
 *
 *   `E004`   admin → `/profile`            offered, then refused
 *   `E134`   provider → `/find-work`       offered, then refused
 *   buyer onboarding → `/work/new`         offered, then refused
 *   `E040`/`E044`  buyer → `/stats`, `/account-health`, `/recommendations`
 *   `E046`   buyer → the whole `/settings` tree
 *
 * EVERY ONE IS THE SAME SENTENCE: **a nav offering a route the gate refuses.**
 * The user clicks a thing they can see and lands on `/dashboard?noaccess=1`.
 *
 * ── ⚠⚠ THE INVARIANT IS NOT INVENTED HERE. IT IS ALREADY WRITTEN DOWN ────────
 *
 * `nav.ts`'s own `requires?: Capability` docblock says it is
 *
 *   *"Keyed on the SAME `Capability` union `access.ts` uses to guard the routes
 *   themselves … so a menu entry and the page it points at cannot disagree about
 *   who is allowed there."*
 *
 * That is precisely this file's assertion. The rule existed as an INTENTION and
 * nothing enforced it, which is how it broke five times. This is the enforcement.
 *
 * ⚠⚠ AND IT DELIBERATELY DOES NOT MODEL "PERSONAS". A persona → capability table
 * does not exist in this codebase, and `nav.ts` explicitly warns against
 * inventing one — faking `USER_CLASS` *"would put a second, lying source of
 * truth next to the real one."* So this compares TWO DECLARATIONS THAT ALREADY
 * EXIST — the item's `requires` and the route's `ROUTE_ACCESS` entry — and
 * nothing else. A guard encoding a wrong model is worse than no guard.
 *
 * THE RULE, in full:
 *   · route requires a CAPABILITY  → the item must declare the SAME capability
 *   · route requires `authenticated` or is public → any item may point at it
 * `requires` omitted means *"everyone signed in sees it"* (nav.ts), so an
 * omitted `requires` against a capability-gated route is the defect itself.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { ROUTE_ACCESS, type RouteRequirement } from "@/lib/route-access";
import {
  ADMIN_NAV,
  ADMIN_PERSONA_NAV,
  ADMIN_SETUP,
  PAGE_TABS,
  PERSONA_NAV,
  PROVIDER_NAV,
  REQUESTER_NAV,
  bandPrefixesFor,
  type NavItem,
} from "@/lib/nav";
import { SETTINGS_NAV } from "@/lib/settings-nav";
/* ⚠ §6 asserts that removing a rail item did not take a support-ticket category
   with it — the two are coupled through `journeyKey()`, and nothing else in the
   harness would notice. */
import {
  allSupportApplicationValues,
  supportApplicationLabel,
} from "@/lib/support-applications";

let pass = 0;
const failures: string[] = [];
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) pass += 1;
  else failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
};

/**
 * The edge's own resolution, restated: LONGEST MATCHING PREFIX WINS, so
 * `/settings/x` beats a shorter match. Unlisted is PUBLIC by design — that is
 * `route-access.ts`'s stated rule, not an assumption made here.
 */
function requirementFor(rawHref: string): RouteRequirement | "public" {
  const href = rawHref.split("?")[0].split("#")[0];
  if (!href.startsWith("/")) return "public";
  let best: { prefix: string; requires: RouteRequirement } | null = null;
  for (const r of ROUTE_ACCESS) {
    if (href === r.prefix || href.startsWith(r.prefix + "/")) {
      if (!best || r.prefix.length > best.prefix.length) best = r;
    }
  }
  return best ? best.requires : "public";
}

/** Every item in a menu, submenu children included. */
function flatten(items: NavItem[]): NavItem[] {
  const out: NavItem[] = [];
  for (const i of items) {
    out.push(i);
    const kids = (i as NavItem & { children?: NavItem[] }).children;
    if (kids) out.push(...kids);
  }
  return out;
}

const MENUS: { name: string; items: NavItem[] }[] = [
  { name: "REQUESTER_NAV", items: flatten(REQUESTER_NAV) },
  { name: "PROVIDER_NAV", items: flatten(PROVIDER_NAV) },
  { name: "PERSONA_NAV", items: flatten(PERSONA_NAV) },
  /* ⚠⚠ ONE LIST NOW (`P2-ALL-E687` WS-A, ruling 89f) — `PERSONA_NAV` above is
     the merged list, so walking the two halves separately would walk it twice.
     ⚠ SUPERSEDED, quoted not deleted (`E164`):
     //   { name: "PERSONA_NAV_PRIMARY", items: flatten(PERSONA_NAV_PRIMARY) },
     //   { name: "PERSONA_NAV_SECONDARY", items: flatten(PERSONA_NAV_SECONDARY) }, */
  { name: "ADMIN_PERSONA_NAV", items: flatten(ADMIN_PERSONA_NAV) },
  { name: "ADMIN_SETUP", items: [ADMIN_SETUP] },
  { name: "ADMIN_NAV", items: flatten(ADMIN_NAV.flatMap((g) => g.items)) },
  /* Tab destinations are nav too — a tab that refuses is the same defect with a
     different shape, and `/settings/packages`' second tab leaves its own area. */
  ...Object.entries(PAGE_TABS).map(([k, v]) => ({
    name: `PAGE_TABS["${k}"]`,
    items: v as NavItem[],
  })),
  /* The settings tab set lives in its own module (see `SettingsTabs`), so it is
     named explicitly rather than reached through PAGE_TABS. */
  { name: "SETTINGS_NAV", items: SETTINGS_NAV as NavItem[] },
];

/* ── 1 · NO MENU OFFERS A ROUTE ITS OWN DECLARATION CANNOT OPEN ───────────── */
for (const menu of MENUS) {
  for (const item of menu.items) {
    const need = requirementFor(item.href);
    if (need === "public" || need === "authenticated") {
      pass += 1; // reachable by anyone the menu is shown to
      continue;
    }
    check(
      `1 — ${menu.name} "${item.label}" (${item.href}) declares the capability its route demands`,
      item.requires === need,
      `route needs ${need}, item declares ${item.requires ?? "nothing (= everyone signed in)"}`
    );
  }
}

/* ── 2 · THE FIVE RECORDED INSTANCES, NAMED, SO A REGRESSION IS OBVIOUS ────── */
const settingsNeed = requirementFor("/settings/security");
check(
  "2 — E046: the settings tree is reachable by a buyer",
  settingsNeed === "authenticated",
  `/settings/security resolves to ${settingsNeed}`
);
for (const href of ["/stats", "/account-health", "/recommendations"]) {
  const need = requirementFor(href);
  check(
    `2 — E040/E044: ${href} is reachable by a buyer`,
    need === "authenticated",
    `resolves to ${need}`
  );
}
check(
  "2 — E004: /profile is reachable by a Panameer employee",
  requirementFor("/profile") === "authenticated"
);

/* ── 3 · THE RESOLVER ITSELF IS RIGHT, or rule 1 proves nothing ───────────── */
check(
  "3 — longest prefix wins, so a nested rule beats a shorter one",
  requirementFor("/admin/learn") === "canAdminister"
);
check(
  "3 — an unlisted route reads as public, which is route-access.ts's stated rule",
  requirementFor("/this-route-is-not-listed") === "public"
);
check(
  "3 — a query string does not defeat the match",
  requirementFor("/settings/security?tab=2fa") === "authenticated"
);
check(
  "3 — ROUTE_ACCESS was actually loaded",
  ROUTE_ACCESS.length > 5,
  `${ROUTE_ACCESS.length} rule(s)`
);
check(
  "3 — the menus were actually loaded",
  MENUS.reduce((n, m) => n + m.items.length, 0) > 40,
  `${MENUS.reduce((n, m) => n + m.items.length, 0)} item(s)`
);

/*
  ── ⚠⚠⚠ 4 · THE BAND KNOWS WHERE YOU ARE (`P2-A3-E596` WS-A) ──────────────

  ⚠ SCOTT, 2026-09-20, on `/community/score`: the tab row said `CONNECT ·
  Profile` and the band lit NOTHING. ⚠⚠ TWO NAVIGATION LAYERS ON ONE PAGE
  DISAGREEING ABOUT WHICH APPLICATION YOU ARE IN.

  ⚠⚠ THIS GATE PROVED A PAGE COULD BE *REACHED* AND NOTHING PROVED THE CHROME
  KNEW WHERE YOU HAD ARRIVED. That is the assertion that was missing.

  ── ⚠ ENUMERATED, NOT LISTED (`E587`'s lesson) ───────────────────────────

  ⚠⚠ THE ROUTES COME FROM `PAGE_TABS` AT RUNTIME — every key, and every tab
  destination under it. A page added to a tab row later is caught by this gate
  rather than by Scott. ⚠ A hard-coded list of `/community/*` would have gone
  stale the first time somebody added a tab, which is the whole point.

  ── ⚠⚠ WHAT IS ASSERTED, AND WHAT DELIBERATELY IS NOT ────────────────────

  ⚠ THE RULE IS *"the band lights SOMETHING"*, not *"the band lights the item
  this tab row belongs to"*. A Connect tab legitimately points at
  `/my-services`, which is SELL's — cross-links between applications are
  correct, and asserting otherwise would encode a bug as a rule.
  ⚠⚠ THE DEFECT IS A DARK BAND, and that is what this catches.
*/
const BAND_ITEMS: NavItem[] = [
  ...flatten(REQUESTER_NAV),
  ...flatten(PROVIDER_NAV),
  ...flatten(ADMIN_NAV.flatMap((g) => g.items)),
];
/** ⚠ `AppBand`'s own rule, reproduced: EXACT for the landing routes, prefixes
 *  otherwise. The prefixes themselves come from `bandPrefixesFor`, so this
 *  cannot drift from the component — it asks the same function. */
const BAND_EXACT = new Set(["/dashboard", "/admin"]);
function bandLights(pathname: string): NavItem[] {
  return BAND_ITEMS.filter((i) =>
    BAND_EXACT.has(i.href)
      ? pathname === i.href
      : bandPrefixesFor(i.href).some((pre) => pathname.startsWith(pre))
  );
}

/* ⚠ Every route a tab row can put you on: the PAGE_TABS keys and their tab
   destinations, de-duplicated, query strings stripped. */
const TAB_ROUTES = [
  ...new Set(
    Object.entries(PAGE_TABS).flatMap(([key, items]) => [
      key,
      ...items.map((t) => t.href),
    ])
  ),
].map((h) => h.split("?")[0]);

/*
  ── ⚠⚠ ONE KNOWN-OPEN ROUTE, AND IT IS NOT A LOOPHOLE ─────────────────────

  ⚠ `/settings` IS NOT A BAND APPLICATION TODAY. It is reached from the ACCOUNT
  menu (`PERSONA_NAV`'s *"My Settings"*), so the band is correctly dark there —
  and the Connect tab row nonetheless offers it, which is the same disagreement
  in a third shape. ⚠⚠ THE FIX IS THE SETTINGS ABSORPTION BRIEF, which this
  work stream unblocks and which the brief says *"adds a third prefix here"*.
  Pre-empting that decision inside a band fix would be drift.

  ⚠⚠⚠ THE `KNOWN_OPEN` MECHANISM IS `check:email`'S, AND BOTH ITS SAFEGUARDS
  ARE KEPT, because Scott approved it only with them:
    1 AN ENTRY THAT STARTS *PASSING* FAILS THE GATE, so it cannot rot silently.
    2 IT CARRIES THE DATE IT WAS OPENED AND ITS AGE IS PRINTED EVERY RUN —
      *"a visible age is what stops this becoming a parking lot."*
*/
const BAND_KNOWN_OPEN: Readonly<Record<string, { since: string; why: string }>> = {
  /*
    ── ⚠⚠⚠ THE PROFILE TAB ROW IS ACCOUNT-MENU TERRITORY (`P2-A2-E600` WS-A) ──

    ⚠ `E600` gives six pages under the avatar one tab row, which puts them all
    in `TAB_ROUTES`. ⚠⚠ FIVE OF THE SIX LIGHT NO BAND APPLICATION, AND THAT IS
    CORRECT — they are reached from your own picture, not from Connect, Learn,
    Work, Sell, Orders or Get Paid. The brief says so: *"Account-menu routes
    light no band app (E596 rule). Extend the named list to any new route
    here."*
    ⚠⚠⚠ `/community/score` IS DELIBERATELY **NOT** LISTED. Measured: it lights
    `Connect`, because it lives under `/community` and `bandPrefixesFor`
    resolves that through Connect. An entry for it would START PASSING and
    therefore FAIL — the first of this mechanism's two safeguards, working.
    ⚠ Each carries its own date and prints its age every run, the second
    safeguard: *"a visible age is what stops this becoming a parking lot."*
  */
  "/profile": {
    since: "2026-09-22",
    why: "The owner's profile is an ACCOUNT-menu destination since P2-A2-E598 WS-B — it left Connect's tab row and lights no band application by design.",
  },
  "/stats": {
    since: "2026-09-22",
    why: "Statistics is an ACCOUNT-menu destination. Its own header and page are Scott's to design; this brief only gives it a tab.",
  },
  "/account-health": {
    since: "2026-09-22",
    why: "Account standing is between a member and Panameer, not an application in the band.",
  },
  /* ⚠⚠⚠ `/company` AND `/settings` ARE NO LONGER TAB DESTINATIONS AT ALL
     (`P2-ALL-E687` WS-B, rulings 89a/89b), SO THEIR KNOWN-OPEN ENTRIES DESCRIBE
     NOTHING AND ARE REMOVED. ⚠⚠ **THE GATE CAUGHT THIS ITSELF** — its own
     safeguard says *"every entry must name a real tab route, so deleting a
     route without clearing its entry is caught"*, and it went red the moment
     the rows changed. **That is the safeguard working, not a gate to weaken.**
     ⚠ Both routes are still reachable, from the avatar menu: `My Company` and
     `My Account Settings` (`7abd2a4`).
     ⚠ SUPERSEDED, quoted not deleted (`E164`):
     //   "/company": { since: "2026-09-22", why: "My Company is reached from the avatar menu…" },
     //   "/settings": { since: …, why: … } */
};

for (const route of TAB_ROUTES) {
  const lit = bandLights(route);
  const open = BAND_KNOWN_OPEN[route];
  if (open) {
    const days = Math.floor((Date.now() - Date.parse(open.since)) / 86_400_000);
    /* ⚠ SAFEGUARD 1 — a known-open entry that starts passing FAILS. */
    check(
      `4 — KNOWN OPEN (${days}d, since ${open.since}) ${route} — ${open.why}`,
      lit.length === 0,
      lit.length > 0
        ? `it now lights ${lit.map((i) => i.href).join(", ")} — REMOVE the known-open entry`
        : undefined
    );
    continue;
  }
  check(
    `4 — the band lights an application on ${route}`,
    lit.length > 0,
    lit.length === 0 ? "band is DARK — the tab row says one thing, the band says nowhere" : undefined
  );
}

/* ⚠ And the known-open list cannot grow silently: every entry must name a real
   tab route, so deleting a route without clearing its entry is caught. */
for (const route of Object.keys(BAND_KNOWN_OPEN)) {
  check(
    `4 — known-open route ${route} is still a real tab destination`,
    TAB_ROUTES.includes(route)
  );
}

/* ═══ 5 · ⚠⚠⚠ THE RULED ROWS, AND THE COUNT LIMIT (`P2-ALL-E687` WS-B) ══════

   ⚠⚠⚠ **THIS SECTION EXISTS BECAUSE A MUTATION FOUND NOTHING HOLDING IT.**
   Appending a SIXTH tab to `/profile` left every gate green — `check:community`
   owns the `/connect` row and **nothing owned `/profile`'s at all**, so the
   brief's own criterion (*"/profile renders exactly Profile · Score · Usage ·
   Health"*) had no assertion behind it. ⚠ Ruling 90: a gate proved only toward
   the defect proves it can fail, not that it fails for the right reason — and
   this one could not fail at all.

   ⚠⚠ **THE COUNT LIMIT IS RULED (88a/88b) AND IS ASSERTED FOR EVERY ROW.**
   Measured at 390px: a 5-character tab is ~64px and five fit; the limit is what
   makes a single row possible, and Lane 1's mobile brief depends on it.

   ⚠⚠⚠ **ONE-WORD IS *NOT* ASSERTED, AND THAT IS DELIBERATE.** `89h` is OPEN —
   `All Learning Paths`, `Offers for My Services`, `Create a Request`,
   `Payment Requests` are under the count and over the word rule, and **Scott
   has not ruled.** ⚠ Asserting it would redden four rows of correct,
   unruled code, which is the false red §10 and ruling 90 both forbid. **They
   are PRINTED below so the open ruling stays visible instead.** */
{
  const rows = PAGE_TABS as Record<string, { label: string; href: string }[]>;
  const keys = Object.keys(rows);
  check("5 — PAGE_TABS has rows to check (E586)", keys.length >= 4, `${keys.length}`);

  /* ⚠ 89c, exact. ⚠⚠ `Company` and `Settings` left (89b/89a); their doors are
     `My Company` and `My Account Settings` in the avatar menu, which §1 walks. */
  check(
    "5 — ⚠⚠⚠ /profile is exactly Profile · Score · Usage · Health (89c)",
    (rows["/profile"] ?? []).map((t) => t.label).join(" · ") === "Profile · Score · Usage · Health",
    (rows["/profile"] ?? []).map((t) => t.label).join(" · ")
  );
  /* ⚠ Asserted POSITIVELY as well, because dropping a name from a list proves
     nothing on its own — the same discipline `check:community` applies to
     Connect's row. */
  for (const gone of ["Company", "Settings"]) {
    check(
      `5 — ⚠⚠ \`${gone}\` is not a /profile tab — the avatar menu owns it`,
      !(rows["/profile"] ?? []).some((t) => t.label === gone),
      (rows["/profile"] ?? []).map((t) => t.label).join(" · ")
    );
  }

  /* ⚠⚠ THE LIMIT, EVERY ROW (88a/88b). A sixth tab is the defect this catches. */
  for (const k of keys) {
    check(
      `5 — ⚠ ${k} is at most five tabs (88b — one row, no sideways scroll)`,
      (rows[k] ?? []).length <= 5,
      `${(rows[k] ?? []).length} tabs: ${(rows[k] ?? []).map((t) => t.label).join(" · ")}`
    );
  }

  const multi = keys
    .flatMap((k) => (rows[k] ?? []).filter((t) => t.label.trim().includes(" ")).map((t) => `${k}:${t.label}`));
  console.log(`  · 89h OPEN — ${multi.length} multi-word tab(s), reported not asserted: ${multi.join(", ")}`);
}

/* ═══ 6 · THE OPERATIONAL MENU IS FIVE PER ROLE (`P2-ALL-E688`, ruling 89e) ══

   ⚠ Scott, 2026-09-27: *"roll it up into orders. NOTHING gets paid without an
   Order."* ⚠⚠ Money leaves the row on BOTH sides; the doors live on `/orders`
   and `check:orders` §6 owns them.

   ⚠⚠⚠ **ASSERTED AS THE EXACT ROW, NOT AS A COUNT.** A count of five is
   satisfied by any five items, so it would pass while somebody swapped `Sell`
   for `Settle` — the `E603` lesson that a gate can assert the right rule about
   the wrong thing. The count is asserted too, because it is what ruling 88b
   limits and what the mobile brief's gates depend on. */
{
  const rails: [string, { label: string }[]][] = [
    ["PROVIDER_NAV", [...PROVIDER_NAV]],
    ["REQUESTER_NAV", [...REQUESTER_NAV]],
  ];
  const EXPECTED: Record<string, string> = {
    PROVIDER_NAV: "Connect · Learn · Work · Sell · Orders",
    REQUESTER_NAV: "Connect · Learn · Hire · Shop · Orders",
  };
  for (const [name, items] of rails) {
    const got = items.map((i) => i.label).join(" · ");
    check(`6 — ⚠⚠⚠ ${name} is exactly ${EXPECTED[name]} (89e)`, got === EXPECTED[name], got);
    check(`6 — ⚠ ${name} is FIVE items, the M1 limit (88b)`, items.length === 5, `${items.length}`);
    /* ⚠ POSITIVELY ABSENT. Dropping a name from a list proves nothing on its
       own — the same discipline §5 applies to the profile row. */
    for (const gone of ["Get Paid", "Pay", "Track Orders"]) {
      check(
        `6 — ⚠⚠ \`${gone}\` is not on ${name} — Orders owns the money door now`,
        !items.some((i) => i.label === gone),
        got
      );
    }
  }

  /*
    ── ⚠⚠⚠ RULE 5, ON THE SURFACE THE BRIEF DID NOT SCOPE ────────────────────

    ⚠⚠ `support-applications.ts` BUILDS THE SUPPORT-TICKET CATEGORY LIST OUT OF
    THESE TWO RAILS. `Get Paid` and `Pay` both carried `heading: "Payments"`, so
    both keyed to `payments` — **and removing them would have taken the category
    with them, leaving no way to file a payments ticket** while a live row sat on
    that exact value.

    ⚠⚠⚠ **SCOTT RULED IT STAYS (option a), 2026-09-27: *"Support categories match
    the complaint, not the data model."*** ⚠ So it moved to `EXTRA`, beside
    `onboarding`, which is there for the same reason — **and this asserts it,
    because a future rail edit could silently take it away again.**
  */
  /*
    ── ⚠⚠⚠ THE SELLER'S DOOR INTO `/my-services` (`P2-ALL-E693`, ruling `89e`
       corrected) ────────────────────────────────────────────────────────

    ⚠ Scott, 2026-09-27: *"Slot 4 is Shop for everyone — Sell is gone, it becomes
    a button inside Shop."* ⚠⚠ **MEASURED BEFORE THE BUTTON WAS WRITTEN:
    `/my-services` had EXACTLY ONE unconditional door — the `Sell` rail entry.**
    Everything else is conditional (a profile link, two stats cards) or is
    already inside `/my-services`' own tab row.

    ⚠⚠⚠ **SO THIS ASSERTS THE REPLACEMENT DOOR, NOT THE MENU ITEM.** Once `Sell`
    leaves slot 4, this button is what stands between a provider and an 89-line
    live page — the same shape as `check:orders` §6 for the money surface.
    ⚠ The capability guard is asserted too: `/my-services` requires
    `canProvideServices`, so an ungated button would be `E579` inside the very
    page that exists to prevent it.
  */
  {
    const shop = readFileSync(join("src", "app", "(app)", "packages", "page.tsx"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    check(
      "6 — ⚠⚠ Shop carries the seller's door into /my-services (89e corrected)",
      /href="\/my-services"/.test(shop),
      "Sell left the menu; this button is what replaces it"
    );
    check(
      "6 — ⚠ and that door is gated on canProvideServices, not shown to everyone",
      /canProvideServices\(viewer\)/.test(shop) && /from "@\/lib\/access"/.test(shop)
    );
    /* ⚠⚠⚠ AND SHOP ITSELF MUST OPEN FOR EVERYONE, or slot 4 is a door onto a
       wall for sellers. `guardPage` refuses by redirecting to
       `/dashboard?noaccess=1` — visibly bouncing a member out of their own menu.
       ⚠ `/packages` is NOT in `route-access.ts`, so §1 reads it as public and
       cannot see this; the guard lives in the page and is asserted here. */
    check(
      "6 — ⚠⚠⚠ Shop opens for everyone signed in, because slot 4 is universal",
      /guardPage\("authenticated"\)/.test(shop),
      "a capability-gated Shop would bounce sellers out of their own menu (E579)"
    );
  }

  check(
    "6 — ⚠⚠⚠ `payments` is still a filable support category (rule 5)",
    allSupportApplicationValues().includes("payments"),
    allSupportApplicationValues().join(", ")
  );
  /* ⚠ AND IT STILL HAS A LABEL. `supportApplicationLabel` returns an unknown
     value AS ITSELF, so a lost category does not blank — it degrades to the raw
     slug, which is quieter and therefore easier to miss. */
  check(
    "6 — ⚠⚠ and the live row's `payments` value still renders a LABEL, not a slug",
    supportApplicationLabel("payments") === "Payments",
    supportApplicationLabel("payments")
  );
  /* ⚠ THE OTHER RAIL-DERIVED CATEGORIES MUST SURVIVE THE RENAME TOO. `Track
     Orders` became `Orders`, and `journeyKey()` reads `heading ?? label` — so
     the key is `work-orders` either way. Asserted rather than reasoned about. */
  check(
    "6 — ⚠ the `Track Orders` -> `Orders` rename did not move its ticket key",
    allSupportApplicationValues().includes("work-orders"),
    allSupportApplicationValues().join(", ")
  );
}

/* ⚠⚠⚠ `E586` — A GATE WITH NO INPUTS MUST FAIL. If `PAGE_TABS` were empty, or
   the import silently resolved to nothing, every assertion above would simply
   not run and this section would report success by saying nothing. */
check(
  "4 — TAB_ROUTES was actually enumerated",
  TAB_ROUTES.length >= 10,
  `${TAB_ROUTES.length} route(s)`
);
check(
  "4 — the band menus were actually loaded",
  BAND_ITEMS.length > 5,
  `${BAND_ITEMS.length} item(s)`
);
/* ⚠ And the multi-prefix mechanism itself is asserted, so deleting
   `BAND_EXTRA_PREFIXES` cannot quietly satisfy the rule above. */
check(
  "4 — Connect owns /community as well as /connect",
  bandPrefixesFor("/connect").includes("/community"),
  bandPrefixesFor("/connect").join(", ")
);
check(
  "4 — an exact landing route gains no extra prefixes",
  bandPrefixesFor("/dashboard").length === 1
);

if (failures.length > 0) {
  console.error(`check:nav-reachable — ${failures.length} FAILED, ${pass} passed\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`check:nav-reachable — ${pass}/${pass} passed`);
