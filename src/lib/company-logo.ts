/**
 * Company-logo suggestion (brief_U / E043).
 *
 * SERVER ONLY. Resolves a typed company name to one or more candidate logos so
 * the provider can ACCEPT, change or remove one. Never auto-applied: name →
 * company matching is fuzzy, and a confidently-wrong logo on a profile looks
 * worse than no logo at all.
 *
 * Providers, in order:
 *   1. **Logo.dev** — the post-Clearbit standard. `img.logo.dev/{domain}` needs
 *      a publishable token; a brand-search endpoint resolves name → domain when
 *      a secret key is configured.
 *   2. **Brandfetch** — alternative, same shape; used when its key is present.
 *   3. **Wikidata (P154)** — no key, no account, covers well-known brands, and
 *      is why this feature still does something useful with nothing configured.
 *
 * DEGRADES CLEANLY (the Resend/Twilio/OAuth rule): every network call is lazy,
 * guarded and individually try/caught. With no keys set you still get Wikidata
 * results, and if everything fails the caller simply gets an empty list — the
 * employer form keeps working and manual entry is unaffected.
 */

export type LogoSuggestion = {
  url: string;
  source: "logo.dev" | "brandfetch" | "wikidata";
  /** What matched, so the UI can say which company this logo belongs to. */
  label: string;
  domain?: string;
};

export function logoApiConfigured(): boolean {
  return Boolean(
    process.env.LOGODEV_TOKEN ||
      process.env.LOGODEV_SECRET_KEY ||
      process.env.BRANDFETCH_API_KEY
  );
}

/**
 * Wikimedia's API policy REQUIRES a descriptive User-Agent and serves an error
 * page to requests without one. Node's fetch sends no useful UA by default,
 * which is why the keyless fallback silently returned nothing until this was
 * added — curl worked, `fetch` didn't.
 */
const WIKI_UA =
  "Panameer/1.0 (https://panameer.com; provider profile logo lookup)";

/** Short timeout: a logo hint must never hold up saving an employer. */
async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Logo.dev brand search → name, domain, logo URL. */
async function fromLogoDev(name: string): Promise<LogoSuggestion[]> {
  const secret = process.env.LOGODEV_SECRET_KEY;
  const token = process.env.LOGODEV_TOKEN;
  if (!secret && !token) return [];

  // Brand search needs the secret key; without it we can still build a logo URL
  // from a guessed domain, which is deliberately NOT done here — guessing a
  // domain from a company name is exactly the fuzzy step we refuse to hide.
  if (!secret) return [];

  const data = (await fetchJson(
    `https://api.logo.dev/search?q=${encodeURIComponent(name)}`,
    { headers: { Authorization: `Bearer ${secret}` } }
  )) as { name?: string; domain?: string }[] | null;

  if (!Array.isArray(data)) return [];

  return data
    .filter((d) => d?.domain)
    .slice(0, 4)
    .map((d) => ({
      url: token
        ? `https://img.logo.dev/${d.domain}?token=${token}&size=200&format=png`
        : `https://img.logo.dev/${d.domain}?size=200&format=png`,
      source: "logo.dev" as const,
      label: d.name ?? d.domain!,
      domain: d.domain,
    }));
}

/** Brandfetch brand search → name, domain, icon. */
async function fromBrandfetch(name: string): Promise<LogoSuggestion[]> {
  const key = process.env.BRANDFETCH_API_KEY;
  if (!key) return [];

  const data = (await fetchJson(
    `https://api.brandfetch.io/v2/search/${encodeURIComponent(name)}`,
    { headers: { Authorization: `Bearer ${key}` } }
  )) as { name?: string; domain?: string; icon?: string }[] | null;

  if (!Array.isArray(data)) return [];

  return data
    .filter((d) => d?.icon)
    .slice(0, 4)
    .map((d) => ({
      url: d.icon!,
      source: "brandfetch" as const,
      label: d.name ?? d.domain ?? name,
      domain: d.domain,
    }));
}

/**
 * Wikidata P154 ("logo image"). Keyless, so this is the fallback that keeps the
 * feature alive on an unconfigured environment. Two hops: search for the
 * entity, then read its logo claim.
 */
async function fromWikidata(name: string): Promise<LogoSuggestion[]> {
  const search = (await fetchJson(
    "https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&limit=5&search=" +
      encodeURIComponent(name),
    { headers: { "User-Agent": WIKI_UA, Accept: "application/json" } }
  )) as { search?: { id: string; label?: string; description?: string }[] } | null;

  const hits = search?.search ?? [];
  if (hits.length === 0) return [];

  const out: LogoSuggestion[] = [];
  for (const hit of hits.slice(0, 4)) {
    const entity = (await fetchJson(
      `https://www.wikidata.org/wiki/Special:EntityData/${hit.id}.json`,
      { headers: { "User-Agent": WIKI_UA, Accept: "application/json" } }
    )) as {
      entities?: Record<
        string,
        { claims?: Record<string, { mainsnak?: { datavalue?: { value?: string } } }[]> }
      >;
    } | null;

    const claim = entity?.entities?.[hit.id]?.claims?.P154?.[0];
    const file = claim?.mainsnak?.datavalue?.value;
    if (!file) continue;

    // Commons "Special:FilePath" resolves a file NAME to the actual image and
    // handles the md5-bucket path, so we don't have to compute it.
    out.push({
      url: `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(
        file
      )}?width=200`,
      source: "wikidata",
      label: hit.label ? `${hit.label}${hit.description ? ` — ${hit.description}` : ""}` : name,
    });
  }
  return out;
}

/**
 * Suggest logos for a company name. Returns [] rather than throwing — a failed
 * suggestion is a missing nicety, never a blocked save.
 */
export async function suggestCompanyLogos(
  rawName: string
): Promise<LogoSuggestion[]> {
  const name = (rawName ?? "").trim();
  if (name.length < 2) return [];

  const results: LogoSuggestion[] = [];
  for (const provider of [fromLogoDev, fromBrandfetch, fromWikidata]) {
    try {
      results.push(...(await provider(name)));
    } catch (e) {
      console.error("[logo] suggestion provider failed (non-fatal):", e);
    }
    // Enough to choose from; don't pay for the slower fallbacks.
    if (results.length >= 4) break;
  }

  // De-dupe by URL, keeping provider order (keyed providers first).
  const seen = new Set<string>();
  return results.filter((r) => !seen.has(r.url) && seen.add(r.url)).slice(0, 6);
}
