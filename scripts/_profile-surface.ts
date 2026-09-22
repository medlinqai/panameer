import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

/**
 * ── ⚠⚠⚠ WHICH FILE *IS* THE PUBLISHED PROFILE? ASK THE ROUTE (`E597` WS-D) ─
 *
 * ⚠ SCOTT, 2026-09-21: *"Retire `check:review-edit`'s named-file list. Sweep
 * every gate for reads of `ProviderProfileView.tsx`."*
 *
 * ── ⚠⚠ THE DEFECT THIS RETIRES ───────────────────────────────────────────
 *
 * ⚠⚠⚠ THREE GATES READ `src/components/profile/ProviderProfileView.tsx` AS A
 * HARDCODED PATH, AND **NOTHING HAS IMPORTED THAT FILE SINCE `E588`.** Measured
 * 2026-09-21: zero live imports anywhere in `src/`. Their assertions were
 * perfectly true about 46KB of code that no route renders.
 * ⚠⚠ A GREEN ASSERTION ABOUT A DEAD FILE IS WORSE THAN NO ASSERTION — it is
 * counted in a gate table and read as coverage of a live surface.
 *
 * ── ⚠ SO THE PATH IS DERIVED, NOT WRITTEN DOWN ───────────────────────────
 *
 * ⚠⚠ The buyer-facing profile route is the authority: whatever component IT
 * imports and RENDERS is the published profile, by definition. When the surface
 * moves again — and `E588` proves it does — the gates follow it instead of
 * quietly asserting about the file left behind.
 * ⚠⚠⚠ IT THROWS RATHER THAN RETURNING EMPTY (`E586`): a resolver that answers
 * `""` would make every regex assertion above it fail-open, which is the exact
 * class of defect this module exists to remove.
 */

const strip = (s: string) =>
  s
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");

/**
 * ⚠ THE ROUTE THAT RENDERS A PROVIDER TO A BUYER. It is the published profile
 * by the only definition that matters — what a visitor is served.
 */
const PUBLISHED_PROFILE_ROUTE = join("src", "app", "(app)", "providers", "[id]", "page.tsx");

/** Resolve a `@/…` specifier to a real file, trying both TS extensions. */
function resolveAlias(spec: string): string | null {
  const rel = spec.replace(/^@\//, "");
  for (const ext of [".tsx", ".ts"]) {
    const p = join("src", rel + ext);
    if (existsSync(p)) return p;
  }
  return null;
}

/**
 * The file that renders the published provider profile, derived from the route.
 *
 * ⚠⚠ THE TEST IS "IMPORTED **AND** RENDERED". An import alone is not enough —
 * the dead component was still named in commented-out imports, and a resolver
 * that trusted an import would have kept pointing at it.
 */
export function publishedProfileFile(): string {
  const route = strip(readFileSync(PUBLISHED_PROFILE_ROUTE, "utf8"));
  const imports = [...route.matchAll(/import\s*\{([^}]*)\}\s*from\s*["'](@\/[^"']+)["']/g)];
  const candidates: string[] = [];
  for (const m of imports) {
    const spec = m[2];
    if (!/^@\/components\//.test(spec)) continue;
    for (const raw of m[1].split(",")) {
      const name = raw.replace(/\s+as\s+\S+/, "").trim();
      /* ⚠ RENDERED, not merely imported — `<Name` must appear in the body. */
      if (!name || !new RegExp(`<${name}[\\s/>]`).test(route)) continue;
      /* ⚠⚠ THE PROFILE, NOT ITS NEIGHBOURS. The same route renders
         `ConnectControls` (the connect/message buttons) beside the profile, so
         the name has to say "profile" for this to be an answer rather than a
         coin flip. */
      if (!/profile/i.test(name)) continue;
      const file = resolveAlias(spec);
      if (file) candidates.push(file);
    }
  }
  const unique = [...new Set(candidates)];
  if (unique.length !== 1) {
    throw new Error(
      `_profile-surface: expected exactly ONE rendered profile component in ${PUBLISHED_PROFILE_ROUTE}, found ${unique.length} [${unique.join(", ")}] — ` +
        `the published profile moved and the gates reading it must be re-pointed, not made to pass (E586)`
    );
  }
  return unique[0];
}

/** The published profile's source, comments stripped (`E164` quotes are not code). */
export function publishedProfileCode(): string {
  return strip(readFileSync(publishedProfileFile(), "utf8"));
}
