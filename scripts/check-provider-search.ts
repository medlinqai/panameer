import { readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

let pass = 0;
const failures: string[] = [];
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) pass++;
  else failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
};

const strip = (s: string): string =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/^([ \t]*)\/\/.*$/gm, (_m, i) => i);

const PAGE = join("src", "app", "(app)", "search", "page.tsx");
const MATCH = join("src", "lib", "work-request-match.ts");
const FEED = join("src", "lib", "work-feed.ts");
const CATALOG = join("src", "lib", "catalog.ts");

for (const [label, f] of [
  ["the search page", PAGE],
  ["the one ranker", MATCH],
  ["the work feed", FEED],
  ["the catalog", CATALOG],
] as const) {
  check(`0 — ${label} exists where this guard expects it`, existsSync(f), f);
  check(`0 — ${label} is not empty`, existsSync(f) && statSync(f).size > 0);
}

const page = existsSync(PAGE) ? strip(readFileSync(PAGE, "utf8")) : "";
const match = existsSync(MATCH) ? strip(readFileSync(MATCH, "utf8")) : "";
const feed = existsSync(FEED) ? strip(readFileSync(FEED, "utf8")) : "";

check(
  "0 — stripping comments left live code behind in all three",
  page.trim().length > 800 && match.trim().length > 800 && feed.trim().length > 400,
  `page ${page.trim().length}, match ${match.trim().length}, feed ${feed.trim().length}`
);

/* ═══ 1 · THE DOOR IS NO LONGER A WALL ═════════════════════════════════════ */

/*
  ⚠⚠ `/search` SITS IN THE PRIMARY CHROME — `AppHeader` renders `SEARCH_NAV` twice —
  so a `ComingSoon` there is `E579` in the one place a curious member clicks first.
*/
check(
  "1 — ⚠⚠⚠ `/search` no longer renders `ComingSoon`",
  page.length > 0 && !/ComingSoon/.test(page),
  "it was 8 lines of ComingSoon in the primary chrome — E579, a live door onto a wall"
);
check(
  "1 — MUTATION: this scan WOULD catch a ComingSoon coming back",
  /ComingSoon/.test('return <ComingSoon title="Search" />;')
);
/* ⚠ Ruling 95 check 1 — the heading is `SEARCH_NAV.label` verbatim. */
check(
  "1 — ⚠ the `<h1>` is the word the menu uses, not a nicer one",
  /<h1[^>]*>\s*Search\s*<\/h1>/.test(page),
  "the name a member clicks and the name they arrive at must agree; renaming the menu is Scott's"
);
check(
  "1 — ⚠ and the page is guarded",
  /guardPage\(/.test(page),
  "the matcher takes no Viewer, so the PAGE is where access is decided (load-bearing rule 5)"
);

/* ═══ 2 · ⚠⚠⚠ ONE RANKER. THIS IS THE SECTION THAT MATTERS. ════════════════ */

/*
  ⚠⚠ THE PRECEDENCE LIVES IN EXACTLY ONE PLACE: `matchWeight → relevantSkills →
  growth → name`, inside `rankMatchedProviders`. ⚠⚠⚠ A COPY OF IT ANYWHERE ELSE IS THE
  DEFECT, and it would look like a reasonable local sort to whoever wrote it.
*/
check(
  "2 — ⚠⚠⚠ the ranking comparator exists in `work-request-match.ts`",
  /b\.matchWeight - a\.matchWeight/.test(match) &&
    /b\.relevantSkills - a\.relevantSkills/.test(match),
  "if this moved, every assertion below is pointing at the wrong file"
);
check(
  "2 — ⚠⚠⚠ ABSENCE: the search page contains NO comparator of its own",
  page.length > 0 && !/matchWeight|relevantSkills|\.sort\(|localeCompare/.test(page),
  "a second ranking rule would disagree with the buyer's suggested-providers list on the same data (E585)"
);
check(
  "2 — MUTATION: that absence WOULD catch a local sort",
  /matchWeight|relevantSkills|\.sort\(|localeCompare/.test(
    "providers.sort((a, b) => b.matchWeight - a.matchWeight);"
  )
);
/*
  ⚠ AND THE OTHER DIRECTION: the page must actually CALL the shared function, or
  "no comparator here" is satisfied by a page that ranks nothing at all.
*/
check(
  "2 — ⚠⚠ the page calls the shared matcher rather than querying providers itself",
  /matchProvidersForSkills\(/.test(page) && !/providerProfile\.findMany/.test(page),
  "E586's shape: an absence assertion passes loudest when the subject is missing"
);
check(
  "2 — ⚠⚠⚠ the shared core is ONE function and the request path DELEGATES to it",
  /export async function matchProvidersForSkills\(/.test(match) &&
    /return matchProvidersForSkills\(\{\s*skillIds: wr\.skillIds/.test(match),
  "matchProvidersFor must be a wrapper — two bodies is two rankers however alike they start"
);
/*
  ⚠⚠ THE OWNERSHIP CHECK MUST STAY IN THE WRAPPER. The core deliberately takes no
  `Viewer`; if `getWorkRequest` ever left the wrapper, a request nobody owns could be
  ranked.
*/
check(
  "2 — ⚠⚠ the request path still proves ownership BEFORE any provider is read",
  /const wr = await getWorkRequest\(viewer, workRequestId\);[\s\S]{0,200}matchProvidersForSkills/.test(
    match
  ),
  "the core has no Viewer by design, so the wrapper is the only thing enforcing ownership"
);

/*
  ── ⚠⚠⚠ AND THE FEED IS NOT THE PROVIDER RANKER, WHICH THE BRIEF BELIEVED ───

  ⚠ Recorded as an assertion so the next reader cannot repeat it: `work-feed.ts` ranks
  WORK for a provider by **count of overlapping skills**, and reads no `weight`.
  ⚠⚠ If that ever changes, this gate should fail and somebody should decide whether the
  two rules have converged on purpose.
*/
check(
  "2 — ⚠⚠ `work-feed.ts` still ranks by overlap COUNT and reads no weight",
  /b\._overlap - a\._overlap/.test(feed) && !/weight/.test(feed),
  "the brief said to invert this file; it holds a different rule, and inverting it would have BUILT the second matcher"
);

/* ═══ 3 · THE CATALOG IS READ, NOT RE-IMPLEMENTED ══════════════════════════ */

/*
  ⚠⚠⚠ THE PAIR, NOT THE DOMAIN ALONE. `getSkillsForField`'s own docblock: *"filtering
  on the domain alone would mix Application-Specific 'Payables' with
  Operations-Specific 'Payables Specialist'."* ⚠ Using `getSkillsForPillar` when a role
  is known would offer skills from a role the member did not choose.
*/
check(
  "3 — ⚠⚠⚠ a chosen (role, domain) reads the PAIR reader, not the domain-only one",
  /getSkillsForField\(/.test(page) && !/getSkillsForPillar\(/.test(page),
  "the domain-only reader mixes roles — the catalog says so in its own words"
);
check(
  "3 — MUTATION: that scan WOULD catch the domain-only reader",
  /getSkillsForPillar\(/.test("await getSkillsForPillar(domain.id)")
);
check(
  "3 — ⚠ the page builds no catalog query of its own",
  !/prisma\./.test(page),
  "a fourth way to list skills is a fourth thing to keep in step (E585)"
);

/* ═══ 4 · IDS FROM THE FORM ARE RESOLVED, NEVER TRUSTED ════════════════════ */

/*
  ⚠ These are catalog ids, not ownership-bearing ids — but an unresolved id still must
  not reach a query. ⚠⚠ The page looks each one up and keeps `null` on a miss.
*/
check(
  "4 — ⚠⚠ every id from the URL is resolved against the catalog before use",
  /tree\.find\(\(r\) => r\.id === sp\.role\)/.test(page) &&
    /domains\.find\(\(d\) => d\.id === sp\.domain\)/.test(page) &&
    /skillOptions\.find\(\(s\) => s\.id === sp\.skill\)/.test(page),
  "an id that does not resolve becomes null and is ignored"
);
check(
  "4 — ⚠⚠⚠ ABSENCE: no raw `sp.` value is handed to the matcher",
  !/matchProvidersForSkills\(\{[^}]*sp\./.test(page),
  "the resolved objects are what the query sees"
);

/* ═══ 5 · NO MATCH IS WORDS, AND NOTHING EMPTY IS STYLED AS A FEATURE ══════ */

check(
  "5 — ⚠⚠ a zero-result search renders a sentence",
  /providers\.length === 0/.test(page) && /No provider on Panameer holds/.test(page),
  "the brief: if nothing matches, say so in words"
);
/*
  ⚠⚠⚠ AND THE LIST MARKUP ONLY EXISTS WHEN THERE IS SOMETHING IN IT. An empty `<ul>`
  with a heading above it is an empty list dressed as a feature.
*/
check(
  "5 — ⚠⚠⚠ the results list renders ONLY when it has rows",
  /providers\.length > 0 && \(/.test(page),
  "an empty styled list is the E586 family in a screen"
);
check(
  "5 — ⚠ the un-searched state is also a sentence, not an empty table",
  /!searched &&/.test(page)
);
/*
  ⚠⚠ AND IT SAYS WHY EACH PROVIDER MATCHED. `MatchedProvider.matchWeight`'s own comment
  says it is *"exposed so the UI can say WHY somebody is first instead of asserting
  it"*, and the matched names are the readable form of that.
*/
check(
  "5 — ⚠⚠ each row names the skills it matched on",
  /matchedSkillNames/.test(page),
  "a ranked list that will not say what it ranked on asks to be trusted rather than read"
);

/* ═══ 6 · ⚠⚠⚠ NO MONEY, NO WRITES — WS-C IS SKIPPED AND STAYS SKIPPED ══════ */

/*
  ⚠ The brief: *"IF THE COMMISSIONS BRIEF HAS NOT LANDED, STOP AT WS-B AND SAY SO.
  Writing a provider onto a line without the flag and the rate leaves money undecided
  on a real row."* ⚠⚠ MEASURED: `WorkRequestLine` has **no `sole_sourced` and no rate
  or commission column**; `sole_sourced` is on `WorkRequest` and `fee_bps` only on
  `WorkOrder`/`WorkOrderLine`, both created at HIRE.
  ⚠⚠⚠ SO THIS PAGE MUST NOT WRITE ANYTHING, AND THE ABSENCE IS ASSERTED RATHER THAN
  TRUSTED — it is the shape that would arrive as a helpful "Invite" button.
*/
const WRITES =
  /\.(create|createMany|update|updateMany|upsert|delete|deleteMany)\s*\(|workRequestLine|sole_sourced|fee_bps/;
check(
  "6 — ⚠⚠⚠ ABSENCE: the search page writes nothing and names no money field",
  !WRITES.test(page),
  "a provider on a cart without its tier is money undecided on a real row"
);
check(
  "6 — MUTATION: that scan WOULD catch a line write or a fee field",
  WRITES.test("await prisma.workRequestLine.create({ data: { sole_sourced: true } });")
);

/* ═══ REPORT ═══════════════════════════════════════════════════════════════ */

if (failures.length > 0) {
  console.error(`check:provider-search — ${failures.length} FAILED, ${pass} passed, 0 not run\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`check:provider-search — ${pass}/${pass} passed, 0 failed, 0 not run`);
console.log("  ⚠ NOTE: WS-C is SKIPPED, not forgotten. WorkRequestLine has no sole_sourced");
console.log("    and no rate column, so choosing a provider here cannot stamp the 4.99% tier.");
console.log("    There is therefore NO control on /search that puts a provider on a cart.");
console.log("  ⚠ Certification ranking is OUT (ruling 93f — the skill->test link does not exist).");
console.log("    The join shipped in E701 and is deliberately NOT ranked on: a rank that");
console.log("    silently ignored it would be worse than one that never claimed it.");
