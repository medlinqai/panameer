import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
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

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(p)) out.push(p);
  }
  return out;
}

/* ═══ 0 · INPUTS FIRST (92) ════════════════════════════════════════════════ */

const COMP = join("src", "components", "profile", "CredentialProvenance.tsx");
const BUYER = join("src", "lib", "provider-profile-view.ts");
const SECTIONS = join("src", "components", "profile", "sections.tsx");

check("0 — the one provenance component exists", existsSync(COMP), COMP);
check("0 — the buyer-facing reader exists", existsSync(BUYER), BUYER);
check("0 — the section renderer exists", existsSync(SECTIONS), SECTIONS);

const comp = existsSync(COMP) ? strip(readFileSync(COMP, "utf8")) : "";
const buyer = existsSync(BUYER) ? strip(readFileSync(BUYER, "utf8")) : "";
const sections = existsSync(SECTIONS) ? strip(readFileSync(SECTIONS, "utf8")) : "";
check(
  "0 — stripping comments left live code behind",
  comp.trim().length > 300 && buyer.trim().length > 500 && sections.trim().length > 500
);

/* ═══ 1 · ONE COMPONENT OWNS THE TREATMENT ═════════════════════════════════ */

check(
  "1 — ⚠⚠ the component decides the words, and both labels are exported constants",
  /PROVENANCE_EARNED\s*=/.test(comp) && /PROVENANCE_SELF\s*=/.test(comp),
  "a renderer that inlines its own string is the second definition (E585)"
);
const earned = /PROVENANCE_EARNED\s*=\s*"([^"]+)"/.exec(comp)?.[1] ?? "";
const self = /PROVENANCE_SELF\s*=\s*"([^"]+)"/.exec(comp)?.[1] ?? "";
check("1 — both labels are non-empty strings", earned.length > 3 && self.length > 3, `"${earned}" / "${self}"`);
check(
  "1 — ⚠⚠⚠ the two states are distinguishable WITH COLOUR REMOVED — the words differ",
  earned.toLowerCase() !== self.toLowerCase(),
  `earned="${earned}" self="${self}" — a buyer in sunlight, or a greyscale screenshot, still reads it`
);
const SHAMING = /unverified|unconfirmed|unproven|alleged|claimed|dubious|⚠|!/i;
check(
  "1 — ⚠⚠⚠ the self-reported label does not imply the credential is doubtful",
  !SHAMING.test(self),
  `"${self}" — a real certificate is valuable and true; it is simply not something Panameer witnessed`
);
check(
  "1 — MUTATION: that scan WOULD catch a shaming label",
  SHAMING.test("Unverified") && SHAMING.test("⚠ Self-reported")
);
check(
  "1 — ⚠⚠ the earned state links to its public verify page",
  /\/verify\/\$\{credentialId\}/.test(comp),
  "a credential a stranger cannot check is a claim, not a certification"
);
check(
  "1 — ⚠⚠⚠ earned is asserted POSITIVELY, so an absent value can never claim a test",
  /issuedFrom === "LEARN"/.test(comp),
  "a default-to-earned would be the trust defect this brief exists to remove (90b)"
);

/* ═══ 2 · THE BUYER-FACING PATH, NAMED EXPLICITLY ══════════════════════════ */

check(
  "2 — ⚠⚠⚠ `provider-profile-view.ts` passes provenance into its view model",
  /issuedFrom: c\.issued_from/.test(buyer),
  "the query had no `select`, so the column was already fetched and only the mapper dropped it"
);
check(
  "2 — ⚠ and the credential id rides with it, so the earned row can offer its page",
  /credentialId: c\.credential_id/.test(buyer)
);
check(
  "2 — ⚠⚠ the shared section renders the component rather than its own treatment",
  /<CredentialProvenance/.test(sections) &&
    !new RegExp(`"${earned}"`).test(sections) &&
    !new RegExp(`"${self}"`).test(sections),
  "the renderer chooses the POSITION; the component chooses the words"
);

const DIRECT = /(?:prisma|tx)\s*\.\s*certification\s*\.\s*(?:findMany|findFirst|findUnique|count|groupBy)\s*\(/;
const NESTED = /certifications\s*:\s*\{\s*(?:orderBy|select|where|include)/;

const EXEMPT: Record<string, string> = {
  [join("src", "lib", "onboarding.ts")]: "writer — creates rows and names issued_from",
  [join("src", "lib", "resume", "import.ts")]: "writer — stamps SELF_REPORTED explicitly",
  [join("src", "lib", "resume", "rerun-diff.ts")]: "compares two extractions, not two provenances",
  [join("src", "lib", "statistics.ts")]: "a count on the owner's own page — splitting it is a figure decision",
};

const readers: string[] = [];
const unaware: string[] = [];
for (const f of walk("src")) {
  const live = strip(readFileSync(f, "utf8"));
  if (!DIRECT.test(live) && !NESTED.test(live)) continue;
  readers.push(f);
  if (f in EXEMPT) continue;
  if (!/issued_from|issuedFrom/.test(live)) unaware.push(f);
}

check(
  "3 — ⚠⚠ the reader census found readers at all",
  readers.length >= 8,
  `${readers.length} found — if this collapsed, the shapes changed and this gate is blind (E610)`
);
check(
  "3 — ⚠⚠⚠ EVERY non-exempt reader of `Certification` carries provenance",
  unaware.length === 0,
  unaware.map((f) => f.replace("src/", "")).join(", ") +
    " — add issued_from, or add a NAMED exemption with its reason"
);
/*
  ⚠ AND THE EXEMPTION LIST MAY NOT ROT: an entry naming a file that no longer reads
  certifications is a carve-out for nothing, and the next reader inherits it by accident.
*/
for (const f of Object.keys(EXEMPT)) {
  check(
    `3 — ⚠ the exemption for ${f.replace("src/", "")} still names a real reader`,
    readers.includes(f),
    "it no longer reads Certification — remove the exemption rather than leaving a hole"
  );
}

/* ═══ 4 · THE SCHEMA WAS NOT TOUCHED ══════════════════════════════════════ */

/*
  ⚠⚠⚠ `93g` PROPOSED SPLITTING THE TABLE AND WAS CORRECTED: the discriminator already
  exists. ⚠ So this gate asserts the enum is still exactly two values — if a third
  appears, the component's positive `=== "LEARN"` test needs a decision, not a default.
*/
const SCHEMA = join("prisma", "schema.prisma");
check("4 — the schema is readable", existsSync(SCHEMA));
const schema = existsSync(SCHEMA) ? readFileSync(SCHEMA, "utf8") : "";
check(
  "4 — ⚠⚠ `CredentialSource` is still exactly SELF_REPORTED and LEARN",
  /enum CredentialSource \{\s*SELF_REPORTED\s*LEARN\s*\}/.test(schema),
  "a third source needs a ruling on how it presents, not a fall-through to self-reported"
);
check(
  "4 — ⚠ and `Certification` still carries the discriminator and the nullable path",
  /issued_from\s+CredentialSource/.test(schema) && /learning_path_id\s+String\?/.test(schema),
  "the render fix depends on the column 93g was told already existed"
);

/* ═══ REPORT ═══════════════════════════════════════════════════════════════ */

if (failures.length > 0) {
  console.error(
    `check:credential-provenance — ${failures.length} FAILED, ${pass} passed, 0 not run\n`
  );
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`check:credential-provenance — ${pass}/${pass} passed, 0 failed, 0 not run`);
console.log(`  readers found: ${readers.length} · exempt (named, with reasons): ${Object.keys(EXEMPT).length}`);
console.log(`  labels: "${earned}" vs "${self}" — distinguishable as TEXT, not by colour`);
console.log("  ⚠ MEASURED 2026-09-29: 12 certifications, ALL 12 SELF_REPORTED, 0 earned,");
console.log("    CertificationAttempt 0. learn-assessment.ts:979 already writes LEARN, so the");
console.log("    writer exists and the FIRST PASS makes this live. Preventative, not cosmetic.");
