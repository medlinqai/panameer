/**
 * `check:notifications` — THE HARNESS THAT WAS SKIPPED.
 *
 * It was WS-5 of the notification brief, it was never reached, and it was then
 * listed as a merge gate by two later briefs that could not run it. Built now,
 * to the original specification, deliberately NOT to whatever the code happens
 * to do today.
 *
 * ⚠⚠ THIS HARNESS IS ALLOWED TO FAIL, AND ON THE DAY IT SHIPPED IT DID. A
 * harness written to agree with the code it audits is worth nothing. If an
 * assertion below is red, the answer is a decision about the code or the spec —
 * never a softer assertion.
 *
 *   1  EVERY `category` IN THE REGISTRY EXISTS IN `notification-categories.ts`.
 *      A typo writes rows against a category no settings page renders, so the
 *      recipient can neither find it nor switch it off. That must break the
 *      build, not ship quietly.
 *   2  EVERY EVENT IN `event_behavior.md`'s TABLES HAS A REGISTRY ENTRY. ⚠ THIS
 *      IS THE ONE THAT KEEPS THE SPEC AUTHORITATIVE RATHER THAN DECORATIVE.
 *      ⚠ The assertion is about the REGISTRY, not about trigger call sites: an
 *      event deliberately left unwired — `profile.published`, which is silent on
 *      purpose — is still expected to be declared. Declaring it is how "we chose
 *      not to send this" stays distinguishable from "we forgot".
 *   3  NO REGISTRY ENTRY IS MISSING `aiMode` OR `visibility`. `aiMode` is the
 *      governance record of where autonomy was granted; an entry without one is
 *      an ungoverned event.
 *   4  NO `prisma.notification.create` OUTSIDE `lib/notifications.ts`. One write
 *      path, or the dedupe and the preference lookup are bypassed on day two.
 *
 * ⚠ COMMENTS ARE STRIPPED BEFORE ANY SOURCE SCAN, reusing `check-community.ts`'s
 * `strip()` verbatim. Its header says why and it is worth repeating: this file
 * names the forbidden token itself, and so does `notifications.ts`'s own
 * docblock — a scanner that reads prose fails on its own documentation, and the
 * fix for that is always to weaken the scanner.
 *
 * ── ⚠⚠ THIS HARNESS READS A FILE THAT IS NOT IN THIS REPOSITORY ──────────────
 *
 * `event_behavior.md` lives in `5. Application/2. Claude Sub-Files/`, one level
 * ABOVE the git root — the workspace holds the specs, the repo holds the code.
 * So assertion 2 depends on a path outside version control, and on a checkout of
 * the repo alone the file is absent.
 * ⚠ WHEN IT IS ABSENT THIS HARNESS FAILS. It does not skip. A gate that goes
 * quiet exactly where its input went missing is a gate that reports green on the
 * one machine that could not check anything, and assertion 2 is the whole reason
 * this file exists. Moving the spec into the repo would fix the coupling and is
 * a decision for Scott, not something to route around here.
 */

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { NOTIFICATION_EVENTS } from "@/lib/notification-events";
import { NOTIFICATION_CATEGORIES } from "@/lib/notification-categories";

let pass = 0;
const failures: string[] = [];
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) pass += 1;
  else failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
};

/* ⚠ VERBATIM FROM `scripts/check-community.ts`. Same job, same two regexes; the
   `[^:]` guard is what stops it eating the `//` in a `https://` URL. */
const strip = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const full = join(dir, e);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(full)) out.push(full);
  }
  return out;
}

const entries = Object.entries(NOTIFICATION_EVENTS) as [
  string,
  { event: string; recipient: string; category: string; aiMode: unknown; visibility: unknown }
][];

// ---------------------------------------------------------------------------
// 1 — every category the registry points at is a real, configurable category
// ---------------------------------------------------------------------------

const categoryKeys = new Set(NOTIFICATION_CATEGORIES.map((c) => c.key));
check(
  "1 — the category catalog is not empty",
  categoryKeys.size > 0,
  "nothing to check against"
);
for (const [key, e] of entries) {
  check(
    `1 — registry "${key}" points at a real category`,
    categoryKeys.has(e.category),
    `category "${e.category}" is in no row of notification-categories.ts`
  );
}

// ---------------------------------------------------------------------------
// 2 — every event in the SPEC has a registry entry
// ---------------------------------------------------------------------------

/*
  ⚠ ONLY THE EVENT TABLES. `event_behavior.md` also carries two `| Key | Label as
  shipped |` tables listing the notification CATEGORIES, which are a different
  thing entirely; keying on the exact header row is what tells them apart, and it
  is why a new category table cannot accidentally be read as eighteen missing
  events.
*/
const SPEC = join("..", "2. Claude Sub-Files", "event_behavior.md");
const EVENT_HEADER = ["event", "recipient", "ai mode", "channel", "notes"];

/** Backticks, bold, stray spaces — the spec is prose, the registry is code. */
const cell = (s: string) => s.replace(/[`*]/g, "").replace(/\s+/g, " ").trim();
const idOf = (event: string, recipient: string) =>
  `${cell(event).toLowerCase()} → ${cell(recipient).toLowerCase()}`;

check(`2 — the specification is readable at ${SPEC}`, existsSync(SPEC), "assertion 2 cannot run without it");

if (existsSync(SPEC)) {
  const md = readFileSync(SPEC, "utf8").split("\n");
  const specRows: { event: string; recipient: string; line: number }[] = [];
  let inEventTable = false;

  for (let i = 0; i < md.length; i++) {
    const raw = md[i];
    if (!raw.trimStart().startsWith("|")) {
      inEventTable = false;
      continue;
    }
    const cells = raw.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map(cell);
    /* The header turns the table on; its `|---|` separator is skipped. */
    if (cells.map((c) => c.toLowerCase()).join("|") === EVENT_HEADER.join("|")) {
      inEventTable = true;
      continue;
    }
    if (!inEventTable) continue;
    if (/^:?-{2,}/.test(cells[0] ?? "")) continue;
    if (!cells[0]) continue;
    specRows.push({ event: cells[0], recipient: cells[1] ?? "", line: i + 1 });
  }

  check("2 — the specification's event tables parsed", specRows.length > 0, "no rows found; has the table shape changed?");

  const registryIds = new Set(entries.map(([, e]) => idOf(e.event, e.recipient)));
  for (const row of specRows) {
    check(
      `2 — spec row "${row.event}" → "${row.recipient}" has a registry entry`,
      registryIds.has(idOf(row.event, row.recipient)),
      `event_behavior.md:${row.line} declares it and notification-events.ts does not. ` +
        `An event left UNWIRED still needs its registry row.`
    );
  }

  /* ⚠ AND THE OTHER DIRECTION. The registry's own header says it "MUST NOT
     INVENT ROWS", so a row with no line in the spec is the same drift pointing
     the other way. */
  const specIds = new Set(specRows.map((r) => idOf(r.event, r.recipient)));
  for (const [key, e] of entries) {
    check(
      `2 — registry "${key}" is declared in the specification`,
      specIds.has(idOf(e.event, e.recipient)),
      "notification-events.ts invented a row event_behavior.md does not have"
    );
  }
}

// ---------------------------------------------------------------------------
// 3 — nothing is ungoverned
// ---------------------------------------------------------------------------

for (const [key, e] of entries) {
  check(`3 — "${key}" declares an aiMode`, typeof e.aiMode === "string" && e.aiMode.length > 0);
  check(`3 — "${key}" declares a visibility`, typeof e.visibility === "string" && e.visibility.length > 0);
}

// ---------------------------------------------------------------------------
// 4 — one write path
// ---------------------------------------------------------------------------

const SELF = join("scripts", "check-notifications.ts");
const WRITER = join("src", "lib", "notifications.ts");
const files = [...walk("src"), ...walk("scripts")].filter((f) => f !== SELF);

check(`4 — the one write path exists at ${WRITER}`, existsSync(WRITER));

/* `.create(`, `.createMany(`, `.upsert(` — every way a row can be born. */
const CREATE = /\bnotification\s*\.\s*(create|createMany|upsert)\s*\(/;
for (const f of files) {
  if (f === WRITER) continue;
  const body = strip(readFileSync(f, "utf8"));
  check(
    `4 — ${f} does not write notification rows directly`,
    !CREATE.test(body),
    "every row goes through notify() in lib/notifications.ts, which is where dedupe and preferences live"
  );
}

/* ⚠ AND THE WRITER ITSELF MUST STILL WRITE. Without this the rule above is
   satisfiable by deleting the only real write, which would be a silent
   catastrophe rather than a failing test. */
check(
  "4 — the one write path still writes",
  existsSync(WRITER) && CREATE.test(strip(readFileSync(WRITER, "utf8"))),
  "nothing creates a notification anywhere"
);

// ---------------------------------------------------------------------------

if (failures.length > 0) {
  console.error(`check:notifications — ${failures.length} FAILED, ${pass} passed\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`check:notifications — ${pass}/${pass} passed`);
