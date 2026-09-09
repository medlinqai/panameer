/**
 * `check:recruiter` — the recruiter is a first-class identity, and the three
 * ways it silently becomes "provider" (`P1-A1.3-E401`). `npm run check:recruiter`.
 *
 * ── ⚠⚠ WHAT THIS FILE IS ACTUALLY DEFENDING ────────────────────────────────
 *
 * MEASURED 2026-09-09, live: **92 ProviderProfile rows — 79 with no
 * `work_method` at all, 12 HOURLY, 1 PACKAGES, and ZERO RECRUITER.** The fork
 * has never once been taken. It was not broken; it was UNREACHABLE except
 * through `/join/provider?type=recruiter`, and a query string does not survive
 * a bookmark, a reload, an email link or a retyped URL. Scott walked in without
 * it and was asked *"Tell Clients What You Charge"* on step 4/7.
 *
 * ⚠ SO THE ASSERTIONS ARE ABOUT REACHABILITY AND ABOUT ABSENCE, not about the
 * fork's internals. `RECRUITER_STEPS`, `PROVIDER_STEPS`, `stepsForProfile` and
 * `isRecruiterProfile` are correct and `E401` forbids touching them — the tests
 * below assert they are STILL there and still shaped the same, so a later change
 * that "simplifies" the fork away fails here.
 *
 * ⚠ NO DATABASE AND NO BROWSER. Text scans plus the real functions.
 */
import { readFileSync } from "node:fs";
import { isRecruiterProfile, stepsForProfile } from "@/lib/onboarding";
import { ambiguousSkillNames, skillQualifier } from "@/lib/skill-labels";

let pass = 0;
const failures: string[] = [];
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) pass += 1;
  else failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
};

const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const read = (p: string) => readFileSync(p, "utf8");
const WIZARD = read("src/app/join/provider/page.tsx");
const WIZARD_CODE = stripComments(WIZARD);
const VIEW_TSX = read("src/components/profile/ProviderProfileView.tsx");
const VIEW_TS = read("src/lib/provider-profile-view.ts");
const ONBOARDING = read("src/lib/onboarding.ts");

/* ═══ 1 · THE FORK ITSELF IS UNTOUCHED ═════════════════════════════════════
   ⚠ `E401`: *"DO NOT CHANGE RECRUITER_STEPS, PROVIDER_STEPS, stepsForProfile OR
   isRecruiterProfile — they are correct."* These pin that promise so the next
   brief cannot quietly undo it. */
{
  check(
    "1 — RECRUITER is the discriminator, and only that string",
    isRecruiterProfile({ work_method: "RECRUITER" }) &&
      !isRecruiterProfile({ work_method: "HOURLY" }) &&
      !isRecruiterProfile({ work_method: "PACKAGES" }) &&
      !isRecruiterProfile({ work_method: null })
  );

  const recruiterSteps = stepsForProfile({ work_method: "RECRUITER" });
  const providerSteps = stepsForProfile({ work_method: "HOURLY" });
  /* ⚠⚠ THE ONE PROPERTY THAT MATTERS, tested as a PROPERTY rather than as a
     literal list. Asserting the exact arrays would fail the next time a step is
     legitimately added; asserting that a recruiter is never asked for a rate is
     the actual rule, and it cannot be satisfied by accident. */
  check(
    "1 — a recruiter's itinerary contains no rate step",
    !recruiterSteps.includes("rate" as never),
    recruiterSteps.join(",")
  );
  check(
    "1 — a provider's itinerary DOES contain the rate step",
    providerSteps.includes("rate" as never),
    providerSteps.join(",")
  );
  /* ⚠ AND A NULL METHOD STILL RESOLVES TO THE PROVIDER JOURNEY. That fallback is
     what made the defect invisible, and it is deliberately NOT changed here —
     WS-1 fixes it by ASKING before the itinerary is read, not by re-defaulting.
     Pinned so the fix cannot be "improved" into a second silent default. */
  check(
    "1 — a null work_method still falls back to the provider journey",
    stepsForProfile({ work_method: null }).includes("rate" as never)
  );
}

/* ═══ 2 · WS-1 — THE IDENTITY IS RECOVERABLE INSIDE THE WIZARD ═════════════ */
{
  check(
    "2 — `work_method` is a SCREEN in the Screen union",
    /type Screen =[^;]*"work_method"/.test(WIZARD_CODE)
  );
  /* ⚠⚠ AND IT IS NOT A STEP. If `work_method` ever enters `ALL_STEPS` the
     stepper renumbers every provider's itinerary — the exact thing the brief
     fences off. This is the assertion that the screen stayed uncounted. */
  const allSteps = WIZARD_CODE.match(/const ALL_STEPS[\s\S]*?;/)?.[0] ?? "";
  check(
    "2 — ABSENCE: `work_method` is NOT in ALL_STEPS",
    allSteps.length > 0 && !allSteps.includes("work_method"),
    allSteps ? "found in ALL_STEPS" : "ALL_STEPS not found"
  );
  check(
    "2 — the wizard routes to it when the method is unknown",
    /!s\.profile\?\.workMethod[\s\S]{0,900}setScreen\("work_method"\)/.test(WIZARD_CODE)
  );
  /* ⚠⚠ THE PROPERTY THE BRIEF NAMES: *"a person changing their own mind is
     fine, a URL changing it under them is not."* Both writers of `work_method`
     in this file must sit behind a `!…workMethod` guard. */
  const writes = [...WIZARD_CODE.matchAll(/section:\s*"work_method"/g)];
  check(
    "2 — the wizard has exactly two work_method writers (the URL fork and the screen)",
    writes.length === 2,
    `found ${writes.length}`
  );
  check(
    "2 — the URL fork still refuses to re-type an established profile",
    /wanted === "recruiter" && !s\.profile\?\.workMethod/.test(WIZARD_CODE)
  );
  /* ⚠ THE DEAD CONSTANT IS ALIVE. `WORK_METHOD_OPTIONS` was defined by `E009`
     and referenced NOWHERE for the whole life of the file — lint carried it as
     an unused-variable warning, which is how it was found. Rendering it is the
     fix; this stops it going dead again. */
  check(
    "2 — WORK_METHOD_OPTIONS is rendered, not merely defined",
    (WIZARD_CODE.match(/WORK_METHOD_OPTIONS/g) ?? []).length >= 2
  );
  check(
    "2 — all three options are offered, recruiter included",
    /RECRUITER/.test(WIZARD_CODE.match(/const WORK_METHOD_OPTIONS[\s\S]*?\];/)?.[0] ?? "")
  );
  /* ⚠ AND ANSWERING DOES NOT COST THE DEEP LINK. `resumeInto` is the single
     definition both the mount effect and the screen call; a second copy is how
     `?step=` and `return=review` would get dropped. */
  check(
    "2 — one resume resolver, called by both the mount and the screen",
    (WIZARD_CODE.match(/resumeInto\(/g) ?? []).length === 2 &&
      (WIZARD_CODE.match(/const resumeInto = useCallback/g) ?? []).length === 1
  );
}

/* ═══ 3 · WS-2 — A RECRUITER IS NOT SHOWN A RATE ═══════════════════════════ */
{
  check(
    "3 — the view model asks isRecruiterProfile()",
    /isRecruiterProfile\(profile\)/.test(stripComments(VIEW_TS))
  );
  const viewCode = stripComments(VIEW_TSX);
  check(
    "3 — the identity block's rate is suppressed for a recruiter",
    /rateMinCents=\{p\.isRecruiter \? null : /.test(viewCode) &&
      /rateMaxCents=\{p\.isRecruiter \? null : /.test(viewCode)
  );
  /* ⚠⚠ AND THE TAKE-HOME NUMBER IS NOT MERELY UNRENDERED. `youGet` is the
     service fee applied to an hourly rate a recruiter does not charge; leaving
     it computed is a live wrong number one prop away from a page. */
  check(
    "3 — youGet is not computed for a recruiter",
    /p\.isRecruiter[\s\S]{0,120}rateBreakdown\(/.test(viewCode)
  );
  /* ⚠ ABSENCE: nothing was invented to fill the space. `E401`: *"WHAT A
     RECRUITER SHOWS INSTEAD IS NOT THIS BRIEF'S TO INVENT."* A placement fee, a
     spread or a margin appearing here means somebody answered Scott's open
     question in code instead of asking him. */
  check(
    "3 — ABSENCE: no invented recruiter fee copy",
    !/placement\s*fee|finder'?s?\s*fee|recruiter\s*(fee|margin|spread)/i.test(
      viewCode + stripComments(VIEW_TS)
    )
  );
}

/* ═══ 4 · WS-3 — A CHIP THAT CANNOT BE TOLD APART ══════════════════════════ */
{
  /* The real collision, by name: two `Recruiting` skills, Oracle Fusion Cloud
     and Workday, both Application-Specific. */
  const opts = [
    { name: "Recruiting", area: "Oracle Fusion Cloud" },
    { name: "Recruiting", area: "Workday" },
    { name: "General Ledger", area: "Oracle Fusion Cloud" },
  ];
  const amb = ambiguousSkillNames(opts);
  check("4 — the colliding name is flagged", amb.has("recruiting"));
  check("4 — the unique name is NOT flagged", !amb.has("general ledger"), [...amb].join(","));
  check(
    "4 — a colliding chip carries its domain",
    skillQualifier(opts[0], amb) === "Oracle Fusion Cloud" &&
      skillQualifier(opts[1], amb) === "Workday"
  );
  /* ⚠⚠ THE HALF THAT KEEPS THE COMMON CASE QUIET. `E401`: *"qualifying all 687
     makes the common case noisier to fix 10%."* 82% of catalog rows have a name
     nobody else uses and must render exactly as they did before. */
  check("4 — a unique chip carries NOTHING", skillQualifier(opts[2], amb) === null);
  /* ⚠ AND A COLLIDING SKILL WITH NO DOMAIN GETS NO DANGLING SEPARATOR. */
  check(
    "4 — no qualifier when there is nothing honest to add",
    skillQualifier({ name: "Recruiting", area: null }, amb) === null &&
      skillQualifier({ name: "Recruiting", area: "  " }, amb) === null
  );
  /* ⚠ CASE-INSENSITIVE — the catalog is human-entered. */
  check(
    "4 — collisions are matched case-insensitively",
    ambiguousSkillNames([{ name: "Recruiting" }, { name: "recruiting" }]).has("recruiting")
  );

  /* ⚠⚠ SUPERSEDED CONDITION STAYS GONE. The old chip qualified on
     `roleNames.length > 1` — true when the provider held two ROLES, which is
     false exactly when Scott's collision happened (both skills sat in ONE
     role). Wrong in both directions; this stops it coming back. */
  check(
    "4 — ABSENCE: the chip no longer qualifies on role COUNT",
    !/sk\.area && roleNames\.length > 1/.test(WIZARD_CODE)
  );
  check(
    "4 — both chip lists use the one rule",
    (WIZARD_CODE.match(/skillQualifier\(/g) ?? []).length >= 3
  );
}

/* ═══ 5 · WS-4 — THE CATALOG IS NOT GUESSED AT ═════════════════════════════
   ⚠⚠ `E401` gives three readings for "recruiter is not in the catalog" and says
   DO NOT CHOOSE. So the assertion is that NOTHING was chosen: no new skill, no
   new domain, no rename. `prisma/seed-taxonomy.ts` documents that renaming or
   retiring a taxonomy row re-points or orphans every provider who picked it. */
{
  const catalog = JSON.parse(read("prisma/seed-data/service-catalog.json")) as {
    roles: { name: string; domains: { name: string; skills: ({ name: string } | string)[] }[] }[];
  };
  const rows: { name: string; domain: string; role: string }[] = [];
  for (const r of catalog.roles)
    for (const d of r.domains)
      for (const s of d.skills)
        rows.push({ name: typeof s === "string" ? s : s.name, domain: d.name, role: r.name });

  check("5 — the catalog still holds 687 skill rows", rows.length === 687, String(rows.length));
  /* ⚠ THE EXISTING CONCEPT, which is why adding a row was never obviously
     right: Hire-to-Retire already carries `Talent Acquisition & Recruitment`. */
  check(
    "5 — the recruitment concept already exists under Hire-to-Retire",
    rows.some(
      (r) => r.name === "Talent Acquisition & Recruitment" && r.domain === "Hire-to-Retire"
    )
  );
  /* ⚠⚠ ABSENCE: no row was added for the WORD. If a later change adds a
     `Recruiter` skill or domain, this fails and forces the decision to be
     recorded rather than absorbed. */
  check(
    "5 — ABSENCE: no catalog row was invented for the word 'recruiter'",
    !rows.some((r) => /^recruiter$/i.test(r.name)) &&
      !catalog.roles.some((r) => r.domains.some((d) => /^recruiter$/i.test(d.name))),
    "a Recruiter row now exists — WS-4 is Scott's decision, not the code's"
  );
  /* ⚠ AND THE COLLISION FIGURE IS PINNED AS MEASURED, not as the brief stated
     it. 687 - 615 = 72 SURPLUS ROWS; 52 NAMES are ambiguous; 124 rows wear one.
     The brief's "72 collisions (~10%)" is the surplus-row count. Both numbers
     are true and they answer different questions. */
  const byName = new Map<string, number>();
  for (const r of rows) byName.set(r.name, (byName.get(r.name) ?? 0) + 1);
  const ambiguous = [...byName.values()].filter((n) => n > 1);
  check("5 — 615 distinct skill names", byName.size === 615, String(byName.size));
  check("5 — 52 ambiguous names", ambiguous.length === 52, String(ambiguous.length));
  check(
    "5 — 124 rows wear an ambiguous name",
    ambiguous.reduce((a, b) => a + b, 0) === 124,
    String(ambiguous.reduce((a, b) => a + b, 0))
  );
}

/* ═══ 6 · THE STEP ARRAYS WERE NOT EDITED ══════════════════════════════════
   ⚠ A blunt guard, on purpose: `E401` says *"if you find yourself editing the
   step arrays, STOP AND REPORT."* This asserts both arrays still exist and that
   the recruiter list is still the shorter of the two. */
{
  const code = stripComments(ONBOARDING);
  check("6 — RECRUITER_STEPS still exists", /const RECRUITER_STEPS/.test(code));
  check("6 — PROVIDER_STEPS still exists", /const PROVIDER_STEPS/.test(code));
  check(
    "6 — the recruiter journey is still shorter than the provider journey",
    stepsForProfile({ work_method: "RECRUITER" }).length <
      stepsForProfile({ work_method: "HOURLY" }).length
  );
}

/* ═══ REPORT ══════════════════════════════════════════════════════════════ */

if (failures.length) {
  console.error(`\ncheck:recruiter — ${failures.length} FAILED, ${pass} passed\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`check:recruiter — ${pass}/${pass} passed`);
