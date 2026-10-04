import { readFileSync } from "node:fs";
import { publishedProfileCode, publishedProfileFile } from "./_profile-surface";
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
const WIZARD = [
  "src/app/join/provider/page.tsx",
  "src/components/onboarding/editors/SkillsEditor.tsx",
  "src/components/onboarding/editors/SpecializationsEditor.tsx",
  "src/lib/onboarding-draft.ts",
]
  .map((f) => read(f))
  .join("\n");
const WIZARD_CODE = stripComments(WIZARD);
const VIEW_TS = read("src/lib/provider-profile-view.ts");
const ONBOARDING = read("src/lib/onboarding.ts");

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
  /*
    ── ⚠⚠⚠ THE NAMED FILE IS RETIRED, AND RE-POINTING IT FOUND A REAL GAP ────

    ⚠ These three assertions read `ProviderProfileView.tsx`, which **nothing has
    imported since `E588`** (measured 2026-09-21: zero live imports in `src/`).
    They were true about a file no route serves.
    ⚠⚠⚠ THE PUBLISHED PROFILE IS `ConnectProfile.tsx`, AND IT DOES NOT SUPPRESS
    A RECRUITER'S RATE. Measured: `isRecruiter` appears **0 times** in it, and
    the view model's `rates` predicate is the VIEWER'S CAPABILITY
    (`canHireTalent`), not the profile's `work_method`. So `E401`'s rule — *"a
    recruiter is not shown a rate"* — is enforced NOWHERE LIVE.
    ⚠⚠ IT IS LATENT, NOT LEAKING: 1 `RECRUITER` profile exists and it carries 0
    of the 5 rate columns, so there is no wrong number on a page today.
    ⚠⚠⚠ NOT FIXED HERE, ON PURPOSE. `E401`: *"WHAT A RECRUITER SHOWS INSTEAD IS
    NOT THIS BRIEF'S TO INVENT."* Restoring suppression is a product ruling
    about a surface Scott has been redesigning, and inventing it inside a gate
    sweep is the failure `CLAUDE.md` opens with.

    ⚠ RECORDED WITH `check:email`'S `KNOWN_OPEN` MECHANISM, BOTH SAFEGUARDS KEPT:
      1 AN ENTRY THAT STARTS PASSING FAILS THE GATE — so the day somebody
        implements suppression, this tells them to close the entry.
      2 IT CARRIES ITS DATE AND PRINTS ITS AGE EVERY RUN — *"a visible age is
        what stops this becoming a parking lot."*

    ⚠ SUPERSEDED, quoted not deleted (`E164`):
    //   const viewCode = stripComments(VIEW_TSX);
    //   check("3 — the identity block's rate is suppressed for a recruiter",
    //     /rateMinCents=\{p\.isRecruiter \? null : /.test(viewCode) && …);
    //   check("3 — youGet is not computed for a recruiter",
    //     /p\.isRecruiter[\s\S]{0,120}rateBreakdown\(/.test(viewCode));
  */
  const viewCode = publishedProfileCode();
  const RECRUITER_RATE_OPEN = "2026-09-21";
  const openDays = Math.floor((Date.now() - Date.parse(RECRUITER_RATE_OPEN)) / 86_400_000);
  const suppressed =
    /isRecruiter\s*\?\s*null/.test(viewCode) || /!p\.isRecruiter\s*&&/.test(viewCode);
  check(
    `3 — KNOWN OPEN (${openDays}d, since ${RECRUITER_RATE_OPEN}) the published profile does NOT suppress a recruiter's rate — E401's rule survives only in the unrendered ProviderProfileView.tsx; awaiting Scott`,
    !suppressed,
    suppressed
      ? `${publishedProfileFile()} now suppresses it — REMOVE this known-open entry and restore the real assertions quoted above`
      : undefined
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
