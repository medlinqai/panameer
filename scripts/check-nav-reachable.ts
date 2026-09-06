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
import { ROUTE_ACCESS, type RouteRequirement } from "@/lib/route-access";
import {
  ADMIN_NAV,
  ADMIN_PERSONA_NAV,
  ADMIN_SETUP,
  PAGE_TABS,
  PERSONA_NAV,
  PERSONA_NAV_PRIMARY,
  PERSONA_NAV_SECONDARY,
  PROVIDER_NAV,
  REQUESTER_NAV,
  type NavItem,
} from "@/lib/nav";
import { SETTINGS_NAV } from "@/lib/settings-nav";

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
  { name: "PERSONA_NAV_PRIMARY", items: flatten(PERSONA_NAV_PRIMARY) },
  { name: "PERSONA_NAV_SECONDARY", items: flatten(PERSONA_NAV_SECONDARY) },
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

if (failures.length > 0) {
  console.error(`check:nav-reachable — ${failures.length} FAILED, ${pass} passed\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`check:nav-reachable — ${pass}/${pass} passed`);
