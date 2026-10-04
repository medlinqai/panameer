import { readFileSync } from "fs";
import { ADMIN_NAV } from "@/lib/nav";
import { DRAWER_GROUPS, drawerGroups } from "@/lib/admin-drawers";

const failures: string[] = [];
let pass = 0;
function check(name: string, cond: boolean, msg: string) {
  if (cond) pass++;
  else failures.push(`${name} — ${msg}`);
}

/**
 * ⚠⚠ COMMENTS ARE STRIPPED BEFORE ANY SOURCE SCAN — load-bearing rule 12. This
 * codebase quotes superseded code under `E164`, and a scan of raw text matches
 * the QUOTE as if it were live.
 */
const strip = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
const read = (p: string) => strip(readFileSync(p, "utf8"));

const panel = read("src/components/console/TaskPanel.tsx");
const band = read("src/components/casing/AppBand.tsx");

/* ── §1 the five tabs, in Scott's order ─────────────────────────────────── */

const keys = [...panel.matchAll(/\{ key: "([a-z]+)", label: "([^"]+)"/g)].map((m) => ({
  key: m[1],
  label: m[2],
}));
check(
  "1a — five tabs, in the order Scott named",
  JSON.stringify(keys.map((k) => k.key)) ===
    JSON.stringify(["tasks", "transactions", "configuration", "activity", "reports"]),
  `got ${JSON.stringify(keys.map((k) => k.key))}`,
);
/**
 * ⚠ The strip's own labels are abbreviated to fit 54px, so the FULL words have
 * to exist somewhere a reader and a screen reader both get them.
 */
check(
  "1b — the abbreviations have full words behind them",
  /FULL_LABEL/.test(panel) &&
    /transactions: "Transactions"/.test(panel) &&
    /configuration: "Configuration"/.test(panel) &&
    /aria-label=\{FULL_LABEL\[t\.key\] \?\? t\.label\}/.test(panel),
  "`Transact`/`Config` must not be what an aria-label says",
);

/* ── §2 NO DESTINATION IS ORPHANED ──────────────────────────────────────── */

const navTitles = ADMIN_NAV.map((g) => g.title ?? "");
const claimed = Object.values(DRAWER_GROUPS).flat();
check(
  "2a — every ADMIN_NAV group is claimed by a drawer",
  navTitles.every((t) => claimed.includes(t)),
  `unclaimed: ${JSON.stringify(navTitles.filter((t) => !claimed.includes(t)))} — ` +
    "a group in the menu that no drawer shows is a destination with no door on desktop",
);
check(
  "2b — and no drawer claims a group that does not exist",
  claimed.every((t) => navTitles.includes(t)),
  `missing from ADMIN_NAV: ${JSON.stringify(claimed.filter((t) => !navTitles.includes(t)))} — ` +
    "a renamed group empties a drawer silently, so it fails here instead",
);
check(
  "2c — exactly one drawer per group, not two",
  new Set(claimed).size === claimed.length,
  `duplicated: ${JSON.stringify(claimed)}`,
);
/**
 * ⚠⚠ AND THE ITEMS, NOT ONLY THE GROUP NAMES. §2a compares TITLES; if a group
 * existed with the right title and no items, every assertion above would still
 * pass (ruling 12 — an assertion its own mutation cannot fail).
 */
const reachable = (["transactions", "configuration"] as const).flatMap((k) =>
  drawerGroups(k).flatMap((g) => g.items.map((i) => i.href)),
);
const everyHref = ADMIN_NAV.flatMap((g) => g.items.map((i) => i.href));
check(
  "2d — every admin href is reachable through a drawer",
  everyHref.length > 10 && everyHref.every((h) => reachable.includes(h)),
  `${everyHref.length} hrefs, ${reachable.length} reachable; missing ` +
    `${JSON.stringify(everyHref.filter((h) => !reachable.includes(h)))}`,
);

/* ── §3 THE GEAR AND THE PANEL ARE COMPLEMENTARY ────────────────────────── */

/**
 * ⚠⚠⚠ THE TWO BREAKPOINTS LIVE IN TWO FILES AND NOTHING BUT THIS KEEPS THEM
 * OPPOSITE. ⚠ If both ever hide, fifteen admin destinations lose their only
 * door at that width — rule 5. If both ever show, the gear is the duplicate
 * Scott asked to remove.
 */
check(
  "3a — the panel shows from `lg` up",
  /hidden[^"]*lg:flex/.test(panel),
  "TaskPanel must be hidden below lg and flex at lg",
);
check(
  "3b — and the gear hides from `lg` up",
  /className="contents lg:hidden"/.test(band),
  "the ConfigDrawer in AppBand must be wrapped in `contents lg:hidden`",
);
check(
  "3c — the gear is still rendered, not deleted",
  /<ConfigDrawer/.test(band) && /groups=\{ADMIN_NAV\}/.test(band),
  "mobile keeps the full menu in the band — removing it entirely is NOT the ruling",
);
check(
  "3d — and it is still admin-only",
  /isAdmin && \(\s*<span className="contents lg:hidden">/.test(band),
  "a gear rendered to a member opens an empty panel — a door onto a wall (`E579`)",
);

/* ── §4 44px ────────────────────────────────────────────────────────────── */

check(
  "4a — the strip's tabs are 44px",
  /min-h-11 w-\[54px\]/.test(panel),
  "the icon-plus-label stack measured ~38px before this",
);
const rows = [...panel.matchAll(/flex min-h-11 items-center/g)].length;
check(
  "4b — and every row in every drawer is too",
  rows >= 2,
  `found ${rows} 44px row rules; the shared row helper and the drawer rows both need one`,
);
check(
  "4c — no 40px rows are left behind",
  !/px-3 py-2\.5 text-left/.test(panel),
  "`py-2.5` without `min-h-11` is the 40px row this replaced",
);

/* ── §5 nothing covers an open drawer ───────────────────────────────────── */

/**
 * ⚠ Scott: *"While a drawer is open, nothing covers its links."* The band is
 * `z-index: 40` in `app-band.css`, and a ten-row Transactions drawer is taller
 * than half the viewport, so both facts matter.
 */
check(
  "5a — an open drawer paints above the band",
  /z-50 flex w-80 flex-col/.test(panel),
  "the card must out-rank the band's z-index: 40",
);
check(
  "5b — and is capped against the band's own height variable",
  /maxHeight: "calc\(100dvh - var\(--pm-band-h/.test(panel),
  "a guessed `80vh` would not track the band if the band changed height",
);
check(
  "5c — the band's z-index is still what 5a assumes",
  /z-index:\s*40;/.test(readFileSync("src/components/casing/app-band.css", "utf8")),
  "if the band is raised above 50, 5a stops being the right comparison — fail loudly",
);

if (failures.length) {
  console.error(`\ncheck:task-panel — ${failures.length} FAILED, ${pass} passed`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`\ncheck:task-panel — ${pass}/${pass} passed`);
