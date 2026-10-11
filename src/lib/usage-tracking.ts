import type { UsageApp } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// A-E001: which app a page belongs to, and the two writes (a VISIT per member per app per day; a SIGN_IN per sign-in).
const PREFIX: [string, UsageApp][] = [
  ["/join", "REGISTER"], ["/verify-email", "REGISTER"],
  ["/profile", "PROFILE"], ["/providers", "PROFILE"], ["/your-path", "PROFILE"], ["/account-health", "PROFILE"],
  ["/connect", "CONNECT"], ["/messages", "CONNECT"],
  ["/learn", "LEARN"], ["/training", "LEARN"],
  ["/find-work", "WORK"], ["/hire", "WORK"], ["/create-work", "WORK"], ["/work-requests", "WORK"],
  ["/shop", "SHOP"], ["/cart", "SHOP"], ["/estimates", "SHOP"], ["/catalog", "SHOP"], ["/my-services", "SHOP"],
  ["/orders", "ORDERS"], ["/deliver-work", "ORDERS"],
  ["/payments", "PAY"], ["/pay", "PAY"], ["/manage-money", "PAY"],
];

/** null = don't count (admin pages, API). */
export function appForPath(path: string): UsageApp | null {
  if (path.startsWith("/admin") || path.startsWith("/api")) return null;
  return PREFIX.find(([p]) => path === p || path.startsWith(`${p}/`))?.[1] ?? "OTHER";
}

const today = () => new Date(new Date().toISOString().slice(0, 10));

export async function recordVisit(userId: string, app: UsageApp) {
  const day = today();
  const key = `${userId}|${app}|VISIT|${day.toISOString().slice(0, 10)}`;
  await prisma.usageEvent.upsert({ where: { dedupe_key: key }, create: { user_id: userId, app, kind: "VISIT", day, dedupe_key: key }, update: {} });
}

export async function recordSignIn(userId: string) {
  await prisma.usageEvent.create({ data: { user_id: userId, app: "OTHER", kind: "SIGN_IN", day: today(), dedupe_key: `${userId}|SIGN_IN|${Date.now()}` } });
}
