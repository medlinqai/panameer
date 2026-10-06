import { NextResponse } from "next/server";

// Sign Out (2026-10-05): expire EVERY session-cookie variant. NextAuth's own sign-out only clears the cookie it
// would set now; a browser can also hold an older host-only copy (before the .panameer.com domain, E780) or chunked
// parts, and any survivor keeps the member signed in — Sign Out then "does nothing".
const NAMES = ["next-auth.session-token", "__Secure-next-auth.session-token"];
const PARTS = ["", ".0", ".1", ".2", ".3"];
const EXTRA = ["next-auth.csrf-token", "__Host-next-auth.csrf-token", "next-auth.callback-url", "__Secure-next-auth.callback-url"];

export async function POST(request: Request) {
  const host = (request.headers.get("host") ?? "").split(":")[0].toLowerCase();
  const domains: (string | null)[] = [null, ...(host === "panameer.com" || host.endsWith(".panameer.com") ? [".panameer.com"] : [])];
  const res = NextResponse.json({ ok: true, to: "/login" }, { headers: { "Cache-Control": "no-store" } });
  const expire = (name: string, domain: string | null) =>
    res.headers.append(
      "Set-Cookie",
      `${name}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax` +
        (name.startsWith("__") ? "; Secure" : "") +
        (domain && !name.startsWith("__Host-") ? `; Domain=${domain}` : "")
    );
  for (const d of domains) {
    for (const n of NAMES) for (const p of PARTS) expire(n + p, d);
    for (const n of EXTRA) expire(n, d);
  }
  return res;
}
