/**
 * Host-based split between the public marketing root and the app.
 *
 *   panameer.com, www.panameer.com  → marketing: `/` renders the coming-soon page
 *   localhost (DEV BUILDS ONLY)     → marketing: so the funnel is walkable locally
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

/** Hosts that serve the public marketing page at `/`. THE PRODUCTION LIST. */
const MARKETING_HOSTS = new Set(["panameer.com", "www.panameer.com"]);

/**
 * The dev machine, in its three spellings (brief_marketing_home_localhost).
 *
 * SEPARATE SET, NOT ADDED TO `MARKETING_HOSTS`, and that separation is the
 * whole safety property of this change: the production allowlist is still
 * exactly two entries, and the only way a request reaches this second set is
 * through a build where NODE_ENV is not "production".
 *
 * `[::1]` keeps its brackets because `normalizeHost` keeps them — it strips the
 * port from `[::1]:3100` without touching the literal, so the comparable value
 * is the bracketed form.
 */
const DEV_MARKETING_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

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

/**
 * True when this host should serve the marketing page at `/`.
 *
 * PRODUCTION IS UNCHANGED: the allowlist is still `panameer.com` and
 * `www.panameer.com`, so Vercel previews, `app.panameer.com` and any future
 * staging domain keep redirecting `/` into the app exactly as before.
 *
 * IN DEV, AND ONLY IN DEV, localhost joins them. Without this the front door is
 * unreachable on `localhost:3100` — `/` redirects to `/login` — so the
 * marketing → Sign Up → onboarding → dashboard funnel could not be walked in
 * one pass on the machine it is built on.
 *
 * The guard is `NODE_ENV !== "production"` rather than an env flag, on purpose.
 * Next inlines `process.env.NODE_ENV` at build time, so a production build does
 * not carry a branch that a mis-set variable could later switch on — the
 * localhost allowance is compiled out rather than merely turned off. A flag
 * would be one more thing that can be wrong in an environment nobody is
 * looking at.
 */
export function isMarketingHost(value: string | null | undefined): boolean {
  const host = normalizeHost(value);
  if (MARKETING_HOSTS.has(host)) return true;
  return process.env.NODE_ENV !== "production" && DEV_MARKETING_HOSTS.has(host);
}
