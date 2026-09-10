/**
 * `check:section-endpoint` — every section name the client sends survives the
 * WHOLE path (`P1-A1.4-E405` WS-1/WS-4). `npm run check:section-endpoint`.
 *
 * ── ⚠⚠ THE BUG THIS EXISTS FOR, AND WHY EVERY OTHER TEST WAS GREEN ─────────
 *
 * `POST /api/settings/profile/section` has **TWO** allow-lists on the way in:
 * the Zod schema in `section-schemas.ts`, and `SETTINGS_SECTIONS` in
 * `profile-settings.ts`. `P1-A1.3-E401` added `work_method` to the schema, added
 * the `applyProviderSection` case, pointed the client at the endpoint — and
 * never added it to `SETTINGS_SECTIONS`. Every layer tested green in isolation;
 * the screen returned 400 and Scott could not go forward or back.
 *
 * ⚠ `section-schemas.test.ts` tests the SCHEMA. Nothing tested
 * `SETTINGS_SECTIONS`, and **no test crossed the two** — so nothing asked the
 * only question that matters: *does every name the client sends survive all
 * three layers?* Satisfying two of three is precisely what shipped.
 *
 * ── ⚠⚠ IT MUST NOT AGREE WITH ITSELF (`P1-J1-E387`) ───────────────────────
 *
 * The trap this repo keeps falling into is a check that rebuilds the list it is
 * checking from the same source. ⚠ SO THE FOUR FACTS COME FROM FOUR DIFFERENT
 * PLACES: the names from `src/app` source, the schemas from the real exported
 * `SECTION_SCHEMAS` object, `SETTINGS_SECTIONS` parsed from
 * `profile-settings.ts`, and the cases parsed from `applyProviderSection`'s own
 * body. No two are derived from each other.
 *
 * ⚠ COMMENTS ARE STRIPPED BEFORE EVERY SCAN, and §0 PROVES the strip works by
 * feeding it a section literal inside a comment — this repo has been burned
 * three times by a scanner reading its own prose.
 *
 * ⚠ NO DATABASE AND NO BROWSER.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { SECTION_SCHEMAS } from "@/lib/section-schemas";

let pass = 0;
const failures: string[] = [];
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) pass += 1;
  else failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
};

/** ⚠ Block comments AND line comments, `://` in a URL left alone. */
const strip = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");

/* ═══ 0 · ⚠⚠ PROVE THE COMMENT STRIP BEFORE TRUSTING ANY SCAN ═════════════ */
{
  const SECTION_LITERAL = /section:\s*"([a-z_]+)"/g;
  const names = (src: string) => [...strip(src).matchAll(SECTION_LITERAL)].map((m) => m[1]);
  check("0 — the scan finds a real literal", names(`x({ section: "bio" })`).includes("bio"));
  check(
    "0 — ⚠ a literal inside a BLOCK comment is ignored",
    names(`/* section: "ghost" */ x({ section: "bio" })`).join(",") === "bio"
  );
  check(
    "0 — ⚠ a literal inside a LINE comment is ignored",
    names(`// section: "ghost"\nx({ section: "bio" })`).join(",") === "bio"
  );
  check(
    "0 — a superseded quote cannot resurrect a name",
    !names(`/* ⚠ SUPERSEDED: section: "work_type" */`).includes("work_type")
  );
}

type F = { path: string; code: string };
function walk(dir: string, out: F[] = []): F[] {
  for (const e of readdirSync(dir)) {
    if (e === "node_modules" || e === ".next" || e.startsWith(".")) continue;
    const full = join(dir, e);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(e))
      out.push({ path: relative(".", full), code: strip(readFileSync(full, "utf8")) });
  }
  return out;
}

/* ═══ 1 · WHAT THE CLIENT ACTUALLY SENDS ══════════════════════════════════ */
const APP = walk(join("src", "app"));
const sent = new Map<string, string[]>();
for (const f of APP) {
  for (const m of f.code.matchAll(/section:\s*"([a-z_]+)"/g)) {
    const list = sent.get(m[1]) ?? [];
    list.push(f.path);
    sent.set(m[1], list);
  }
}
check("1 — the guard can see the client's section literals", sent.size >= 2, `${sent.size} found`);
/* ⚠ MEASURED 2026-09-09: exactly two — `work_method` (2 sites) and
   `certifications` (1). A third appearing is a new name to verify, which is
   why the count is pinned rather than assumed. */
check(
  "1 — exactly two distinct section names are posted from src/app",
  sent.size === 2,
  [...sent.keys()].sort().join(", ")
);

/* ═══ 2 · LAYER B — `SETTINGS_SECTIONS`, PARSED FROM ITS OWN FILE ═════════ */
const settingsSrc = strip(readFileSync(join("src", "lib", "profile-settings.ts"), "utf8"));
const block = settingsSrc.match(/const SETTINGS_SECTIONS:[^=]*=\s*\[([\s\S]*?)\]/);
const settingsSections = block ? [...block[1].matchAll(/"([a-z_]+)"/g)].map((m) => m[1]) : [];
check("2 — the guard can read SETTINGS_SECTIONS", settingsSections.length >= 5,
  `${settingsSections.length} entries`);

/* ═══ 3 · LAYER C — THE `case`s INSIDE `applyProviderSection` ═════════════ */
const onboardingSrc = strip(readFileSync(join("src", "lib", "onboarding.ts"), "utf8"));
const fnStart = onboardingSrc.indexOf("async function applyProviderSection");
check("3 — the guard can find applyProviderSection", fnStart > -1);
const fnBody = fnStart > -1 ? onboardingSrc.slice(fnStart) : "";
const cases = new Set([...fnBody.matchAll(/case\s+"([a-z_]+)"\s*:/g)].map((m) => m[1]));
check("3 — the guard can read its cases", cases.size >= 10, `${cases.size} cases`);

/* ═══ 4 · ⚠⚠ THE ASSERTION THE WHOLE FILE EXISTS FOR ═════════════════════ */
for (const [name, files] of [...sent.entries()].sort()) {
  const where = files.join(", ");
  check(
    `4 — "${name}" has a Zod schema`,
    name in SECTION_SCHEMAS,
    `sent from ${where} but absent from SECTION_SCHEMAS`
  );
  check(
    `4 — ⚠ "${name}" is in SETTINGS_SECTIONS`,
    settingsSections.includes(name),
    `sent from ${where} but absent from SETTINGS_SECTIONS — this returns 400`
  );
  check(
    `4 — "${name}" has an applyProviderSection case`,
    cases.has(name),
    `sent from ${where} but nothing persists it`
  );
}

/* ═══ 5 · THE RECRUITER ENTRANCE DOES NOT DISCARD A FAILURE (WS-4.2) ══════
   ⚠ The 400 hid for a week because the `?type=recruiter` branch had `if
   (saved.ok)` and no `else`. A silent failure fell through to a second dead
   screen. */
{
  const wizard = APP.find((f) => f.path.endsWith(join("join", "provider", "page.tsx")));
  check("5 — the guard can see the provider wizard", !!wizard);
  const body = wizard?.code ?? "";
  const recruiterWrite = body.match(
    /wanted === "recruiter"[\s\S]{0,1200}?saved\.ok[\s\S]{0,600}?\n\s{8}\}/
  )?.[0];
  check("5 — the guard can see the recruiter entrance", !!recruiterWrite);
  check(
    "5 — ⚠⚠ the recruiter entrance handles a FAILED write",
    !!recruiterWrite && /\belse\b/.test(recruiterWrite),
    "if (saved.ok) with no else — a 400 is discarded in silence"
  );
  check(
    "5 — and it surfaces the failure through the shared error state",
    !!recruiterWrite && /setError\(/.test(recruiterWrite)
  );
}

/* ═══ 6 · THE SCREEN ITSELF (WS-4.3–4.8) ══════════════════════════════════ */
{
  const wizard = APP.find((f) => f.path.endsWith(join("join", "provider", "page.tsx")));
  const body = wizard?.code ?? "";
  const optionsBlock = body.match(/const WORK_METHOD_OPTIONS = \[([\s\S]*?)\n\];/)?.[1] ?? "";
  check("6 — the guard can see WORK_METHOD_OPTIONS", optionsBlock.length > 0);

  /* ⚠ EXACTLY TWO. A third card returning is how this grows back — the screen
     used to force a choice between HOURLY and PACKAGES that nothing branched on. */
  const values = [...optionsBlock.matchAll(/value:\s*"([A-Z_]+)"/g)].map((m) => m[1]);
  check("6 — ⚠⚠ the screen offers exactly TWO options", values.length === 2, values.join(", "));
  check("6 — they are SERVICES and RECRUITER", values.sort().join(",") === "RECRUITER,SERVICES",
    values.join(", "));

  /* ⚠ SCOTT'S EXACT STRINGS — including the "and/or" and the "hour/month" slash. */
  check(
    "6 — the merged card's title is Scott's exact wording",
    optionsBlock.includes('"I Sell Services and/or Service Products"')
  );
  check(
    "6 — the merged card's description is Scott's exact wording",
    /You sell your time by the hour\/month or pre-defined deliverables\./.test(optionsBlock)
  );

  /* ⚠⚠ NOTHING BRANCHES ON HOURLY-VS-PACKAGES, and that is the property that
     made merging safe. `isRecruiterProfile` stays the only test of the value. */
  const READERS = walk(join("src", "lib")).concat(APP);
  const branchers = READERS.filter(
    (f) =>
      !f.path.endsWith(join("join", "provider", "page.tsx")) &&
      /work_method\s*===\s*"(HOURLY|PACKAGES|SERVICES)"|workMethod\s*===\s*"(HOURLY|PACKAGES|SERVICES)"/.test(f.code)
  );
  check(
    "6 — ⚠⚠ ABSENCE: nothing branches on HOURLY / PACKAGES / SERVICES",
    branchers.length === 0,
    branchers.map((b) => b.path).join(", ")
  );
  const recruiterTests = READERS.filter((f) => /work_method === "RECRUITER"/.test(f.code));
  check(
    "6 — RECRUITER is still the only value anything tests",
    recruiterTests.length >= 2,
    `${recruiterTests.length} files`
  );

  /* ⚠ THE SUPERSEDED ENUM VALUES SURVIVE (`E164`) — existing rows hold them. */
  const schema = readFileSync(join("prisma", "schema.prisma"), "utf8");
  const enumBlock = schema.match(/enum WorkMethod \{([\s\S]*?)\n\}/)?.[1] ?? "";
  const enumCode = strip(enumBlock).replace(/^\s*\/\/\/.*$/gm, " ");
  for (const v of ["SERVICES", "HOURLY", "PACKAGES", "RECRUITER"])
    check(`6 — WorkMethod still holds ${v}`, new RegExp(`\\b${v}\\b`).test(enumCode));

  /* ═══ THE CHROME (WS-4.7) ═══════════════════════════════════════════════ */
  const screen = body.match(/if \(screen === "work_method"\)[\s\S]*?\n  \}/)?.[0] ?? "";
  check("6 — the guard can see the work_method screen", screen.length > 0);
  check("6 — it renders WizardShell", /<WizardShell/.test(screen));
  check("6 — ABSENCE: it no longer renders PlainShell", !/<PlainShell/.test(screen));
  check("6 — it has a Back button", /onBack=\{/.test(screen) && /canBack/.test(screen));
  check("6 — it has \"Finish later\"", /secondaryLabel="Finish later"/.test(screen));
  check("6 — its Continue is the shell's, not hand-drawn",
    /onContinue=\{choose\}/.test(screen) && !/bg-magenta px-7/.test(screen));
  /*
    ── ⚠⚠ INVERTED BY `P1-A1.4-E406` WS-4 — QUOTED, NOT DELETED (`E164`) ───────

    ⚠ SUPERSEDED, and it fired exactly as designed when the counter was added:

        /* ⚠⚠ ASSERT THE ABSENCE OF A COUNTER. A later change that numbers this
           screen must go RED — `title` is genuinely step 1, and two screens both
           reading "1 of 7" is worse than no number. * /
        check(
          "6 — ⚠⚠ ABSENCE: the screen carries NO counter",
          !/\bstep=\{/.test(screen) && !/totalSteps=/.test(screen) && !/counterText=/.test(screen),
          "a step/totalSteps/counterText prop appeared on an UNCOUNTED screen"
        );

    ⚠⚠ ITS REASONING WAS SOUND AND ITS PREMISE WAS FALSE. `E405` believed the
    provider had no get-started page, so `work_method` looked like the unnumbered
    ask. ⚠ `/join/provider/start` EXISTS — the mirror of
    `/join/requester/start` — and it is the ask. `work_method` comes after it, so
    Scott's rule numbers it. ⚠ THE OLD WORRY IS ANSWERED RATHER THAN IGNORED:
    two screens no longer both read "1 of …" because the counted steps are
    offset to start at 2.

    ⚠ AN ABSENCE-ASSERTION THAT IS SIMPLY DELETED IS HOW THE THING IT GUARDED
    COMES BACK, so the guard is REVERSED, not removed: the screen must now carry
    a counter, and it must read 1 of the shared total.
  */
  check(
    "6 — ⚠⚠ the screen carries a counter reading 1 of N",
    /\bstep=\{1\}/.test(screen) && /totalSteps=\{wizardTotal\}/.test(screen),
    "work_method is step 1 of the numbered run; /join/provider/start is the ask"
  );

  /*
    ⚠ THE DENOMINATOR DOES NOT MOVE BETWEEN ITINERARIES (`E406` WS-4.3). If
    anything recomputed it from `RECRUITER_STEPS`, the number would flip under a
    person at the click — which is the thing Scott's answer settles.
  */
  check(
    "6 — ⚠ nothing recomputes the total from RECRUITER_STEPS",
    !/RECRUITER_STEPS\.length/.test(body),
    "the total is the PROVIDER total on both itineraries"
  );
  /* ⚠ THE FIRST COUNTED STEP HAS A BACK NOW (`E406` WS-3) — it returns to the
     work_method screen, which did not exist before `E401`. */
  check(
    "6 — ⚠ the first counted step offers Back",
    /canBack: true/.test(body) && /setScreen\("work_method"\)/.test(body),
    "step 1 had no way back once work_method existed in front of it"
  );
  /* ⚠⚠ "Skip for Now" SURVIVES (`E406` WS-4.6). `WizardShell` has ONE secondary
     slot and the provider wizard spends it here; anything that silently took it
     would remove a way PAST a step to add a way OUT of the wizard. */
  /* ⚠ THREE SITES, AND ONE OF THEM IS CONDITIONAL — the résumé screen reads
     `importOutcome ? undefined : "Skip for Now"`, so a regex anchored to
     `secondaryLabel: "` finds only two and under-reports. Counting the LABEL
     itself is what matches all three. */
  const skips = (body.match(/"Skip for Now"/g) ?? []).length;
  check("6 — ⚠ Skip for Now survives on all three steps", skips === 3, `${skips} found`);
  /* ⚠ `/join/provider/start` IS THE ANCHOR OF THE WHOLE NUMBERING SCHEME — the
     unnumbered get-started ask. If it ever gained a counter, `work_method` would
     no longer be step 1. */
  {
    const start = strip(readFileSync(join("src","app","join","provider","start","page.tsx"),"utf8"));
    check("6 — /join/provider/start exists and renders the ask", /Get Started Now!/.test(start));
    check("6 — ⚠ and it carries NO counter", !/\bstep=\{/.test(start) && !/totalSteps/.test(start),
      "it is the unnumbered ask this scheme is anchored to");
  }
  /* ⚠ NOTHING HARDCODES 7. A recruiter's six steps stay `x of 6`. */
  const hardSeven = READERS.filter((f) => /totalSteps=\{7\}|totalSteps:\s*7\b/.test(f.code));
  check("6 — ABSENCE: nothing hardcodes totalSteps 7", hardSeven.length === 0,
    hardSeven.map((h) => h.path).join(", "));
  /*
    ⚠ SUPERSEDED, quoted not deleted (`E406` WS-1):
        check("6 — totalSteps still comes from the step list",
          /totalSteps:\s*steps\.length/.test(body));

    ⚠⚠ `steps.length` RECOMPUTED THE DENOMINATOR FROM THE CURRENT ITINERARY, so a
    recruiter saw /7 and a provider /8 — and it would have flipped under a person
    at the moment they chose. Scott: *"Use the larger number (7), most will be
    providers."* The total is now fixed for both itineraries.
  */
  /*
    ⚠⚠ THE DERIVATION LIVES ON THE SERVER, AND THAT IS NOT A DETAIL.

    `page.tsx` is `"use client"` and `lib/onboarding` reaches Prisma, so importing
    `PROVIDER_STEPS` into the wizard pulls `dns`/`fs`/`net`/`tls` into the browser
    bundle and `/join/provider` returns 500. ⚠ MEASURED — that is what the first
    attempt did, and `tsc`, lint and every gate stayed green while the page was
    dead. Only walking it found it.

    ⚠ SO THE TOTAL IS DERIVED IN `lib/onboarding.ts` FROM `PROVIDER_STEPS` and
    sent on the status payload. `PROVIDER_STEPS` remains the one source and the
    client holds no copy of the number.
  */
  {
    const ob = strip(readFileSync(join("src", "lib", "onboarding.ts"), "utf8"));
    check(
      "6 — ⚠ the denominator is DERIVED from PROVIDER_STEPS, never typed",
      /displayTotalSteps: PROVIDER_STEPS\.length \+ 1/.test(ob),
      "a literal would be a third copy of a number that already exists twice"
    );
  }
  /* ⚠⚠ AND THE CLIENT MUST NOT IMPORT IT BACK. This is the regression guard for
     the 500 above — it is invisible to every other gate. */
  check(
    "6 — ⚠⚠ ABSENCE: the wizard does not import from lib/onboarding",
    !/from "@\/lib\/onboarding"/.test(body),
    "importing it pulls Prisma into the client bundle and the route 500s"
  );
  check(
    "6 — ⚠⚠ ABSENCE: no literal total is hardcoded",
    !/totalSteps[=:]\s*\{?\s*[0-9]+\s*\}?/.test(body),
    "totalSteps must always reference the derived constant"
  );
  check(
    "6 — the counted steps use the same shared total",
    /totalSteps: wizardTotal/.test(body)
  );
  /* ⚠ AND THE OFFSET EXISTS — the first counted step reads 2, not 1. */
  check(
    "6 — ⚠ the counted steps are offset past the work_method screen",
    /stepIndex >= 0 \? stepIndex \+ 2 : undefined/.test(body),
    "without the offset, two screens both read 1 of N"
  );
}

if (failures.length) {
  console.error(`\ncheck:section-endpoint — ${failures.length} FAILED, ${pass} passed\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`check:section-endpoint — ${pass}/${pass} passed`);
