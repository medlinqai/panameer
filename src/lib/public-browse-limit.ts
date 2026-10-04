import { headers } from "next/headers";

export const BROWSE_LIMIT_PER_MINUTE = 40;

const hits = new Map<string, number[]>();

async function callerKey(): Promise<string | null> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  const ip = fwd?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim();
  return ip || null;
}

export async function browseAllowed(): Promise<boolean> {
  const key = await callerKey();
  if (!key) return true; 
  const now = Date.now();
  const minute = 60 * 1000;
  const recent = (hits.get(key) ?? []).filter((t) => now - t < minute);
  if (recent.length >= BROWSE_LIMIT_PER_MINUTE) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5_000) {
    for (const k of [...hits.keys()].slice(0, 1_000)) hits.delete(k);
  }
  return true;
}
