import {
  computeProviderCompleteness,
  VISIBILITY_THRESHOLD,
  type CompletenessInput,
} from "../src/lib/completeness";
import { isMarketplaceVisible, hasIdentityBlock } from "../src/lib/access";

/**
 * THE GATE HARNESS (brief_onboarding_slimdown WS0).
 *
 *   npm run check:gate
 *
 * WHY THIS EXISTS. `pitfalls.md` opens with the same bug three times: a step is
 * added, moved or removed, the completeness table and the visibility gate are
 * not re-derived, and a provider who answered every question they were asked
 * publishes into permanent invisibility. It is silent — the score is arithmetic,
 * so a missing or unreachable weight produces a plausible number and no error —
 * and the entry's own instruction is to "prove it by walking the journey and
 * asserting the final score; a build or typecheck will never catch this."
 *
 * This is that assertion, made cheap enough to run on every change. It builds
 * the profile a provider has after the REQUIRED-ONLY path — Title, Role(s),
 * Skill, Rate, Photo, Company, plus address and phone for contact — and demands
 * that it publishes AND comes out marketplace-visible.
 *
 * Pure functions only: no database, no network, nothing to set up. The
 * companion end-to-end walk (WS6) proves the same thing through the real
 * endpoints; this proves it in a second, so nobody skips it.
 */

let pass = 0;
let fail = 0;
const lines: string[] = [];
const check = (label: string, ok: boolean, detail?: unknown) => {
  ok ? pass++ : fail++;
  lines.push(
    `  ${ok ? "PASS" : "FAIL"}  ${label}` +
      (ok || detail === undefined ? "" : ` → ${JSON.stringify(detail)}`)
  );
};

/** The profile a provider has after answering ONLY the required steps. */
function requiredOnly(over: Partial<CompletenessInput> = {}): CompletenessInput {
  return {
    headline: "Oracle Cloud P2P Consultant", // 1 Title
    role_type_id: "role-1", //                  2 Role(s)
    pillar_id: "domain-1", //                   the (role, domain) catalog key
    skills: ["skill-1"], //                     3 Skills   (>= 1)
    hourly_rate_cents: 12500, //                4 Rate
    photoUrl: "https://example.test/p.png", //  5 Photo
    hasAddress: true, //                        contact
    hasPhone: true, //                          contact
    // --- everything the slimdown REMOVED as a prompted step ---------------
    overview: null, //        Bio            — not prompted, must not gate
    education: [], //         Education      — not prompted, must not gate
    specializations: [], //   Specializations— not prompted, must not gate
    date_of_birth: null, //   DOB            — removed entirely (WS7)
    // --- other optionals ---------------------------------------------------
    work_method: "HOURLY",
    languages: [],
    employers: [],
    certifications: [],
    onsite_rate_cents: null,
    remote_rate_cents: null,
    rate_min_cents: null,
    rate_max_cents: null,
    phoneVerified: false,
    ...over,
  };
}

console.log("=== the REQUIRED-ONLY path must publish AND be visible ===");
{
  const p = requiredOnly();
  const score = computeProviderCompleteness(p);
  check(
    `required-only scores >= ${VISIBILITY_THRESHOLD} (got ${score})`,
    score >= VISIBILITY_THRESHOLD,
    { score, threshold: VISIBILITY_THRESHOLD }
  );

  const identity = hasIdentityBlock({
    date_of_birth: p.date_of_birth,
    person: { phone: "+15550104477", site: { addresses: [{}] } },
  });
  check("identity = address + phone, WITHOUT a date of birth", identity, {
    identity,
  });

  check(
    "isMarketplaceVisible() is true for the required-only profile",
    isMarketplaceVisible({
      status: "ACTIVE",
      completeness: score,
      paused_at: null,
      hasIdentity: identity,
    })
  );
}

console.log("=== the removed sections must NOT gate ===");
for (const [label, over] of [
  ["no bio", { overview: null }],
  ["no education", { education: [] }],
  ["no specializations", { specializations: [] }],
  ["no date of birth", { date_of_birth: null }],
  ["no languages", { languages: [] }],
  ["no work history", { employers: [] }],
] as [string, Partial<CompletenessInput>][]) {
  const score = computeProviderCompleteness(requiredOnly(over));
  check(
    `${label} still reaches the bar (${score})`,
    score >= VISIBILITY_THRESHOLD,
    { score }
  );
}

console.log("=== the required set really is required ===");
for (const [label, over] of [
  ["no title", { headline: null }],
  ["no role", { role_type_id: null }],
  ["no skills", { skills: [] }],
  ["no rate", { hourly_rate_cents: null }],
  ["no photo", { photoUrl: null }],
  ["no address", { hasAddress: false }],
  ["no phone", { hasPhone: false }],
] as [string, Partial<CompletenessInput>][]) {
  const p = requiredOnly(over);
  const score = computeProviderCompleteness(p);
  const identity = hasIdentityBlock({
    date_of_birth: p.date_of_birth,
    person: {
      phone: p.hasPhone ? "+15550104477" : null,
      site: { addresses: p.hasAddress ? [{}] : [] },
    },
  });
  const visible = isMarketplaceVisible({
    status: "ACTIVE",
    completeness: score,
    paused_at: null,
    hasIdentity: identity,
  });
  // A missing REQUIRED field must stop visibility — by score, by identity, or
  // by the publish gate. Each is checked where it belongs; here we assert the
  // provider does not slip through as visible.
  check(`${label} → NOT visible`, !visible, { score, identity, visible });
}

console.log("=== a full profile still reaches 100 ===");
{
  const score = computeProviderCompleteness(
    requiredOnly({
      overview: "x".repeat(200),
      education: [{}],
      specializations: [{}],
      employers: [{}],
      certifications: [{}],
      languages: [{}],
    })
  );
  check(`complete profile reaches 100 (got ${score})`, score === 100, { score });
}

console.log(lines.join("\n"));
console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
