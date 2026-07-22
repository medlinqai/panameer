/**
 * Host-based split between the public marketing root and the app.
 *
 *   panameer.com, www.panameer.com  → marketing: `/` renders the coming-soon page
 *   everything else                 → app:       `/` redirects to /login
 *
 * The marketing side is the explicit allowlist and the app is the default, so
 * any host we haven't enumerated (Vercel preview URLs, app.panameer.com, a
 * future staging domain, localhost) behaves like the working app rather than
 * silently serving a marketing page over a live environment.
 *
 * Only `/` is affected. /login, /api/*, /dashboard and /admin are identical on
 * every host — see `src/proxy.ts`.
 */

/** Hosts that serve the public marketing page at `/`. */
const MARKETING_HOSTS = new Set(["panameer.com", "www.panameer.com"]);

/**
 * Normalise a Host header value to a bare, comparable hostname: lowercased,
 * port removed, trailing FQDN dot removed. IPv6 literals keep their brackets,
 * which is fine — they are never marketing hosts.
 */
export function normalizeHost(value: string | null | undefined): string {
  if (!value) return "";
  const host = value.trim().toLowerCase();
  // Strip the port, but not the colons inside an IPv6 literal like [::1]:3100.
  const bare = host.startsWith("[")
    ? host.slice(0, host.indexOf("]") + 1)
    : host.split(":")[0];
  return bare.replace(/\.$/, "");
}

/** True when this host should serve the marketing coming-soon page at `/`. */
export function isMarketingHost(value: string | null | undefined): boolean {
  return MARKETING_HOSTS.has(normalizeHost(value));
}
