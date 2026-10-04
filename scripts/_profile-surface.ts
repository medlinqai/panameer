import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const strip = (s: string) =>
  s
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");

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

export function publishedProfileFile(): string {
  const route = strip(readFileSync(PUBLISHED_PROFILE_ROUTE, "utf8"));
  const imports = [...route.matchAll(/import\s*\{([^}]*)\}\s*from\s*["'](@\/[^"']+)["']/g)];
  const candidates: string[] = [];
  for (const m of imports) {
    const spec = m[2];
    if (!/^@\/components\//.test(spec)) continue;
    for (const raw of m[1].split(",")) {
      const name = raw.replace(/\s+as\s+\S+/, "").trim();
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
