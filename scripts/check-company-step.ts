/**
 * `check:company-step` — the stripped company form (`P1-A1.4-E408` WS-5).
 * `npm run check:company-step`.
 *
 * ── ⚠⚠ TWO SCANS, AND MIXING THEM UP IS THE TRAP ──────────────────────────
 *
 * §1–§3 read the **stripped** source (comments removed) and ask *what does this
 * form still render?* — a field that survives only inside a superseded comment
 * must NOT count as present.
 *
 * §4 reads the **raw** source and asks the opposite: *is the removed code still
 * there?* `E164` says comment out, never delete, and the only way to assert that
 * is to look at the text a stripping scan throws away.
 *
 * ⚠ §0 proves the strip before either is trusted.
 *
 * ⚠ NO DATABASE, NO BROWSER, NO MODEL — nothing here costs anything to run.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

let pass = 0;
const failures: string[] = [];
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) pass += 1;
  else failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
};
/*
  ⚠⚠ THE JSX RULE MATCHES `*​/}` EXACTLY, NOT `*​/` THEN A BRACE.

  ⚠ MY FIRST VERSION USED `\*\/\s*\}` AND ATE LIVE CODE — it stopped at the
  first `*​/` anywhere inside the block. `E408` had to neutralise the inner
  `*​/` sequences of the code it commented out (a raw one would terminate the JSX
  comment early and break the build), which leaves those blocks containing
  unmatched `/​*` openers. A lazy matcher walked straight past the real
  terminator and swallowed the Legal Company Name field and the whole submit
  payload — the scan reported fields missing that are plainly on the screen.
  ⚠ REQUIRING THE BRACE TO TOUCH THE STAR-SLASH pins the actual delimiter.
*/
const strip = (s: string) =>
  s
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ") // JSX comment blocks: `{/* … */}`
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");

const FORM = join("src", "components", "company", "CompanyStep.tsx");
const RAW = readFileSync(FORM, "utf8");
const CODE = strip(RAW);

/* ═══ 0 · PROVE THE STRIP ═════════════════════════════════════════════════ */
{
  check("0 — a JSX comment block is stripped", !/ghostField/.test(strip('{/* <Field label="ghostField" /> */}')));
  /* ⚠ THE REGRESSION THAT COST ME A ROUND: a neutralised `* /` inside the block
     must NOT end it early and leak the live field that follows. */
  check(
    "0 — ⚠ a neutralised star-slash inside a JSX comment does not end it",
    /keepMe/.test(strip('{/* dead * / more dead */}\n<Field label="keepMe" />')) &&
      !/deadField/.test(strip('{/* deadField * / still dead */}\n<Field label="keepMe" />'))
  );
  check("0 — a block comment is stripped", !/ghostField/.test(strip("/* ghostField */ real")));
  check("0 — a line comment is stripped", !/ghostField/.test(strip("// ghostField\nreal")));
  check("0 — live code survives", /realField/.test(strip('{/* ghostField */}\n<Field label="realField" />')));
  /* ⚠ AND THE RAW SCAN MUST SEE WHAT THE STRIPPED ONE DOES NOT — §4 depends on it. */
  check("0 — the raw source still contains commented markers", /Business Type/.test(RAW));
  check("0 — and the stripped source does not", !/Business Type/.test(CODE));
}

/* ═══ 1 · EXACTLY THREE FIELDS ════════════════════════════════════════════ */
{
  const labels = [...CODE.matchAll(/label="([^"]+)"/g)].map((m) => m[1]);
  check("1 — Legal Company Name is required", labels.includes("Legal Company Name *"), labels.join(" | "));
  check("1 — ⚠ Country is required and present", labels.includes("Country *"), labels.join(" | "));
  check("1 — Website is present and NOT marked required", labels.includes("Website"), labels.join(" | "));
  check("1 — ABSENCE: Website carries no asterisk", !labels.some((l) => /^Website \*/.test(l)));
  /* ⚠ THE COUNT IS PINNED. A fourth field returning is the regression this brief
     exists to prevent; `Company Name` on the JOIN tab is the search box, so the
     define-mode set is what is counted here. */
  const defineFields = labels.filter((l) =>
    ["Legal Company Name *", "Country *", "Website"].includes(l)
  );
  check("1 — exactly three define-mode fields", defineFields.length === 3, defineFields.join(" | "));
}

/* ═══ 2 · WEBSITE IS OPTIONAL, IN THE CODE AND IN WORDS ══════════════════ */
{
  check(
    "2 — the website hint says optional in plain words",
    /Optional[^"]*leave it blank/i.test(CODE),
    "Scott: most small contractors will not have a website"
  );
  /* ⚠ AND `valid` MUST NOT DEPEND ON IT. */
  const valid = CODE.match(/const valid =[\s\S]*?;\n/)?.[0] ?? "";
  check("2 — the guard can see `valid`", valid.length > 0);
  check("2 — ⚠ website does not gate Continue", !/website/i.test(valid), valid.replace(/\s+/g, " ").slice(0, 160));
  check("2 — ⚠⚠ country DOES gate Continue", /!!country/.test(valid));
  check("2 — the attestation still gates Continue", /attestation/.test(valid));
  check("2 — the company ToS still gates Continue", /companyTos/.test(valid));
}

/* ═══ 3 · ⚠ NO US-SPECIFIC CONTROL SURVIVES — THE INTERNATIONAL FIX ══════ */
{
  for (const [what, re] of [
    ["a business-type select", /TAX_TYPES\.map/],
    ["a state-of-filing select", /US_STATES\.map/],
    ["the corporate-register lookup", /runLookup\s*\(/],
    ["an EIN input", /setEin\(/],
    ["the address block", /<LocationFields/],
    ["a US ZIP message", /US_ZIP_MESSAGE/],
  ] as const) {
    check(`3 — ⚠ ABSENCE: no ${what} is reachable`, !re.test(CODE));
  }
  /* ⚠ EXACTLY ONE COUNTRY FIELD — `E280`'s rule, and it still binds. */
  const countrySelects = [...CODE.matchAll(/COUNTRIES\.map/g)].length;
  check("3 — exactly one country list is rendered", countrySelects === 1, `${countrySelects}`);
}

/* ═══ 4 · ⚠⚠ REMOVED, NOT DELETED (`E164`) — THE **RAW** SCAN ════════════ */
{
  for (const [what, needle] of [
    ["Business Type", "Business Type *"],
    ["the state-of-filing select", "State of filing"],
    ["the EIN field", 'label="EIN"'],
    ["the registered address", "<LocationFields"],
    ["the register lookup", "const runLookup"],
  ] as const) {
    check(`4 — ${what} survives, commented, in the source`, RAW.includes(needle));
  }
  check(
    "4 — the superseded blocks name the brief that removed them",
    (RAW.match(/E408/g) ?? []).length >= 5,
    `${(RAW.match(/E408/g) ?? []).length} references`
  );
}

/* ═══ 5 · ⚠⚠ COUNTRY REACHES THE PAYLOAD — THIS KEEPS BUYERS POSTING ════
   `WORK_REQUEST_BAR` includes "companyCountry"; a null country blocks a work
   request. The select is worth nothing if it never reaches `defineCompany`. */
{
  check("5 — ⚠⚠ the define payload sends the country", /country:\s*country \|\| null/.test(CODE));
  check("5 — ABSENCE: it no longer reads the removed address", !/country:\s*regAddress\.country/.test(CODE));
  check("5 — no business type is sent", /taxType:\s*undefined/.test(CODE));
  /* ⚠ AND THE BAR STILL DEMANDS IT — if that ever changes, this form's country
     field is the thing to revisit, so the two are asserted together. */
  /*
    ⚠ SCOPED TO THE ARRAY, AND MY FIRST VERSION WAS NOT. Testing the whole file
    for `companyCountry` passed even with it removed from `WORK_REQUEST_BAR` —
    the word also appears in the field union, the predicate and the source
    mapping. A gate that greps the file answers a different question from the one
    being asked.
  */
  const bar = strip(readFileSync(join("src", "lib", "identity-bar.ts"), "utf8"));
  const arr = bar.match(/WORK_REQUEST_BAR:\s*IdentityField\[\]\s*=\s*\[([\s\S]*?)\]/)?.[1] ?? "";
  check("5 — the guard can see WORK_REQUEST_BAR", arr.length > 0);
  check(
    "5 — ⚠⚠ WORK_REQUEST_BAR still requires companyCountry",
    /companyCountry/.test(arr),
    "if this bar stops demanding it, the form's country field is what to revisit"
  );
}

/* ═══ 6 · ⚠ THE 404 IS FIXED (WS-2) ═════════════════════════════════════ */
{
  const page = join("src", "app", "(app)", "settings", "company", "page.tsx");
  check("6 — ⚠⚠ /settings/company resolves", existsSync(page), "six hrefs pointed at a 404");
  const src = existsSync(page) ? readFileSync(page, "utf8") : "";
  check("6 — it redirects to /company rather than forking a second form", /redirect\("\/company"\)/.test(strip(src)));
  /* ⚠ EVERY href THAT POINTED AT THE 404 IS COVERED BY THAT ONE ROUTE. */
  const hrefs = ["src/lib/identity-bar.ts", "src/lib/work-request-identity.ts"]
    .map((f) => (readFileSync(f, "utf8").match(/"\/settings\/company"/g) ?? []).length)
    .reduce((a, b) => a + b, 0);
  check("6 — all six hrefs still point at the now-real route", hrefs === 6, `${hrefs} found`);
}

if (failures.length) {
  console.error(`\ncheck:company-step — ${failures.length} FAILED, ${pass} passed\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`check:company-step — ${pass}/${pass} passed`);
