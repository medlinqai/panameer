import { readFileSync as rawRead } from "node:fs";
import { join } from "node:path";

const read = (p: string): string =>
  rawRead(p, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const VAL = join("src", "lib", "project-validation.ts");
const EMP = join("src", "lib", "employers.ts");

let pass = 0;
const failures: string[] = [];
const check = (label: string, cond: boolean, detail = "") => {
  if (cond) {
    pass++;
    console.log(`  PASS  ${label}`);
  } else {
    failures.push(label);
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  }
};

const val = read(VAL);
const emp = read(EMP);

check(
  "1 — ⚠⚠ the resend window is SEVEN DAYS, not an hour (WS-A)",
  /RESEND_COOLDOWN_MS\s*=\s*7\s*\*\s*24\s*\*\s*60\s*\*\s*60\s*\*\s*1000/.test(val),
  "the brief: 'One open request per project; resend after 7 days'"
);

check(
  "2 — ⚠⚠⚠ a provider cannot send to their OWN domain (the self-validation hole)",
  /registrableDomain\(/.test(val) &&
    /ownDomain\s*===\s*domainCheck\.domain/.test(val) &&
    /throw new OnboardingError\(/.test(val),
  "checkContactDomain alone does NOT close this — a provider whose company IS the client passes it"
);

check(
  "3 — ⚠ the own-domain test reads the provider's SIGN-IN address, not the project",
  /prisma\.user\.findFirst\([\s\S]{0,200}?providerProfile/.test(val),
  "it must be the one address we know belongs to them"
);

check(
  "4 — ⚠⚠ there is a DAILY cap, counted in the database",
  /VALIDATION_LIMIT_PER_DAY/.test(val) &&
    /prisma\.projectValidation\.count\(/.test(val) &&
    /sent_at:\s*\{\s*gte:/.test(val),
  "the 7-day cooldown is PER PROJECT, so it caps nothing across a profile"
);

check(
  "5 — ⚠ the cap is scoped to the whole PROFILE, not one project",
  /project:\s*\{\s*provider_profile_id:\s*profileId\s*\}/.test(val)
);

check(
  "6 — ⚠⚠⚠ a material edit drops the badge (Scott's question 2)",
  /materiallyChanged/.test(emp) &&
    /validation_status:\s*"NONE"/.test(emp) &&
    /owned\.validation_status\s*===\s*"VALIDATED"/.test(emp)
);

check(
  "7 — ⚠⚠ …and 'material' is the four facts the client was ASKED about",
  /start_date/.test(emp) &&
    /end_date/.test(emp) &&
    /role_title/.test(emp) &&
    /client_name/.test(emp) &&
    /materiallyChanged/.test(emp),
  "dates, role and client — not the description"
);

check(
  "8 — ⚠⚠ the client's answer is NEVER deleted, only the project's own badge clears",
  !/projectValidation\.delete/.test(emp) && !/projectValidation\.deleteMany/.test(emp),
  "a confirmation is somebody else's statement and is history"
);

if (failures.length > 0) {
  console.error(`\ncheck:validation — ${failures.length} FAILED, ${pass} passed\n`);
  process.exit(1);
}
console.log(`\ncheck:validation — ${pass}/${pass} passed\n`);
