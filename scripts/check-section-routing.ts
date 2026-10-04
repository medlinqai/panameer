import { readFileSync } from "node:fs";
import { join } from "node:path";

let pass = 0;
const failures: string[] = [];
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) pass += 1;
  else failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
};
const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");

const PASSES = join("src", "lib", "resume", "ai-passes.ts");
const RAW = readFileSync(PASSES, "utf8");
const CODE = strip(RAW);

/* ═══ 0 · PROVE THE STRIP ═════════════════════════════════════════════════ */
{
  check("0 — a block comment is stripped", !/ghostToken/.test(strip("/* ghostToken */ real")));
  check("0 — a line comment is stripped", !/ghostToken/.test(strip("// ghostToken\nreal")));
  check("0 — live code survives", /realToken/.test(strip("/* ghostToken */ realToken")));
  check(
    "0 — ⚠ the superseded filter quote is invisible to the scan",
    !/kind !== "engagement"/.test(CODE) || !/filter\(\(i\) => i\.kind !== "engagement"\)/.test(CODE)
  );
}

{
  check(
    "1 — ⚠⚠ the extraction pass receives the WHOLE inventory",
    /employersPass\(text,\s*inv\.value[,)]/.test(CODE),
    "it must not be handed a filtered subset"
  );
  check(
    "1 — ⚠⚠ ABSENCE: no kind-filtered subset is passed to employersPass",
    !/employersPass\(text,\s*employers/.test(CODE),
    "44 of 49 sections were filtered out here"
  );
  check(
    "1 — ABSENCE: the old subset-or-everything fallback is gone",
    !/employers\.length \? employers : inv\.value/.test(CODE)
  );
  check("1 — recall is measured against the whole inventory", /headings: inv\.value\.length/.test(CODE));
}

/* ═══ 2 · `kind` TYPES THE ROW ═══════════════════════════════════════════ */
{
  check(
    "2 — an engagement section becomes a PROJECT row",
    /kind === "engagement"/.test(CODE) && /sectionProjects/.test(CODE)
  );
  check(
    "2 — an employer section stays an EMPLOYER row",
    /kind !== "engagement"/.test(CODE) && /sectionEmployers/.test(CODE)
  );
  check("2 — the employer rows come from the section split", /employers: sectionEmployers/.test(CODE));
  check("2 — the project rows include the section split", /projects: \[\.\.\.sectionProjects/.test(CODE));
  check("2 — ⚠ a converted engagement invents no parent", /employer: null,/.test(CODE));
  check(
    "2 — the split is abandoned when the counts disagree",
    /emp\.value\.length === inv\.value\.length/.test(CODE),
    "a mis-split would file real jobs as projects"
  );
}

{
  check(
    "3 — `kind` survives on the inventory item",
    /kind: z\.enum\(\["employer", "engagement"\]\)/.test(CODE),
    "it is now a default rather than a route — retained, not deleted"
  );
}

{
  check(
    "4 — the failure variant of PassOutcome carries usage",
    /ok: false;[\s\S]{0,120}usage\?: ModelUsage/.test(CODE)
  );
  check("4 — a shape failure returns its usage", /reason: "shape"[\s\S]{0,240}usage: call\.usage/.test(CODE));
  check(
    "4 — ⚠ a failed pass reports finishReason, outputTokens and reasoningTokens",
    /finishReason: r\.usage\?\.finishReason/.test(CODE) &&
      /outputTokens: r\.usage\?\.outputTokens/.test(CODE) &&
      /reasoningTokens: r\.usage\?\.reasoningTokens/.test(CODE),
    "losing this is what made a shape failure and a truncation indistinguishable"
  );
}

{
  check(
    "5 — ABSENCE: no pass chunks or batches its input",
    !/\.slice\(\s*\w+\s*,\s*\w+\s*\)[\s\S]{0,60}Pass\(/.test(CODE) &&
      !/for \(const batch of/.test(CODE),
    "the funnel and chunking are out of scope — the capacity premise was refuted"
  );
  check("5 — the detail passes still run together", /await Promise\.all\(\[/.test(CODE));
}

if (failures.length) {
  console.error(`\ncheck:section-routing — ${failures.length} FAILED, ${pass} passed\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`check:section-routing — ${pass}/${pass} passed`);
