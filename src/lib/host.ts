
/** Hosts that serve the public marketing page at `/`. THE PRODUCTION LIST. */
const MARKETING_HOSTS = new Set(["panameer.com", "www.panameer.com"]);

const DEV_MARKETING_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

const STATUS_HOSTS = new Set(["status.panameer.com"]);
const DEV_STATUS_HOSTS = new Set(["status.localhost", "status.127.0.0.1"]);

export function normalizeHost(value: string | null | undefined): string {
  if (!value) return "";
  const host = value.trim().toLowerCase();
  // Strip the port, but not the colons inside an IPv6 literal like [::1]:3100.
  const bare = host.startsWith("[")
    ? host.slice(0, host.indexOf("]") + 1)
    : host.split(":")[0];
  return bare.replace(/\.$/, "");
}

export function isMarketingHost(value: string | null | undefined): boolean {
  const host = normalizeHost(value);
  if (MARKETING_HOSTS.has(host)) return true;
  return process.env.NODE_ENV !== "production" && DEV_MARKETING_HOSTS.has(host);
}

export function isStatusHost(value: string | null | undefined): boolean {
  const host = normalizeHost(value);
  if (STATUS_HOSTS.has(host)) return true;
  return process.env.NODE_ENV !== "production" && DEV_STATUS_HOSTS.has(host);
}
