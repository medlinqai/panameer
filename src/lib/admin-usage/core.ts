import { cache } from "react";
import { prisma } from "@/lib/prisma";

// A-E002..E010: the shared frame for Admin › Usage — the period, the previous period, test accounts, series and deltas.
export type Range = "7" | "30" | "90" | "all";
export const RANGES: { value: Range; label: string }[] = [
  { value: "7", label: "7 days" }, { value: "30", label: "30 days" }, { value: "90", label: "90 days" }, { value: "all", label: "Since launch" },
];
export const TABS = ["overview", "register", "profile", "connect", "learn", "work", "shop", "orders", "pay"] as const;
export type Tab = (typeof TABS)[number];

const DAY = 86_400_000;
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

export type Ctx = {
  range: Range; includeTest: boolean; tab: Tab;
  from: Date; to: Date; prevFrom: Date | null; prevTo: Date | null; days: string[]; label: string; prevLabel: string | null;
  userOk: (userId: string | null | undefined) => boolean;
  personOk: (personId: string | null | undefined) => boolean;
  personUser: Map<string, string>;
};

export const usageCtx = cache(async (range: Range, includeTest: boolean, tab: Tab): Promise<Ctx> => {
  const [users, people] = await Promise.all([
    prisma.user.findMany({ select: { id: true, is_test: true, created_at: true } }),
    prisma.person.findMany({ select: { id: true, user_id: true } }),
  ]);
  const testUsers = new Set(users.filter((u) => u.is_test).map((u) => u.id));
  const personUser = new Map(people.filter((p) => p.user_id).map((p) => [p.id, p.user_id!]));
  const to = new Date();
  const launch = new Date(Math.min(...users.map((u) => u.created_at.getTime()), to.getTime()));
  const n = range === "all" ? Math.ceil((to.getTime() - launch.getTime()) / DAY) + 1 : Number(range);
  const from = new Date(new Date(isoDay(to)).getTime() - (n - 1) * DAY);
  const prevFrom = range === "all" ? null : new Date(from.getTime() - n * DAY);
  const days = Array.from({ length: n }, (_, i) => isoDay(new Date(from.getTime() + i * DAY)));
  const userOk = (u: string | null | undefined) => !!u && (includeTest || !testUsers.has(u));
  return {
    range, includeTest, tab, from, to, prevFrom, prevTo: prevFrom ? from : null, days,
    label: range === "all" ? "since launch" : `last ${n} days`,
    prevLabel: range === "all" ? null : `previous ${n} days`,
    userOk,
    personOk: (p) => !!p && userOk(personUser.get(p) ?? null) && personUser.has(p),
    personUser,
  };
});

export const inCur = (c: Ctx, d: Date | null | undefined) => !!d && d >= c.from && d <= c.to;
export const inPrev = (c: Ctx, d: Date | null | undefined) => !!d && !!c.prevFrom && d >= c.prevFrom && d < c.from;
/** Where-clause range covering the current and previous period. */
export const span = (c: Ctx) => ({ gte: c.prevFrom ?? c.from });

/** Current count, previous count and the change line ("▲ 64% vs previous 30 days"). */
export function metric(c: Ctx, dates: (Date | null | undefined)[]) {
  const cur = dates.filter((d) => inCur(c, d)).length;
  const prev = c.prevFrom ? dates.filter((d) => inPrev(c, d)).length : null;
  return { value: cur, delta: change(c, cur, prev) };
}
export function change(c: Ctx, cur: number, prev: number | null) {
  if (prev == null || !c.prevLabel) return null;
  if (cur === prev) return `no change vs ${c.prevLabel}`;
  const up = cur > prev;
  const by = prev > 0 ? `${Math.round((Math.abs(cur - prev) / prev) * 100)}%` : `${Math.abs(cur - prev)}`;
  return `${up ? "▲" : "▼"} ${by} vs ${c.prevLabel}`;
}

/** One point per day of the period. */
export function series(c: Ctx, dates: (Date | null | undefined)[]) {
  const m = new Map(c.days.map((d) => [d, 0]));
  for (const d of dates) if (d && inCur(c, d)) { const k = isoDay(d); m.set(k, (m.get(k) ?? 0) + 1); }
  return c.days.map((day) => ({ day, n: m.get(day) ?? 0 }));
}
/** Distinct keys per day (e.g. members active). */
export function distinctSeries(c: Ctx, rows: { day: Date; key: string }[]) {
  const m = new Map(c.days.map((d) => [d, new Set<string>()]));
  for (const r of rows) if (inCur(c, r.day)) m.get(isoDay(r.day))?.add(r.key);
  return c.days.map((day) => ({ day, n: m.get(day)?.size ?? 0 }));
}

export function median(xs: number[]) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
export const daysBetween = (a: Date, b: Date) => Math.max(0, (b.getTime() - a.getTime()) / DAY);
export const fmtDays = (d: number | null) => (d == null ? "—" : `${Math.round(d * 10) / 10} days`);

/** A link to the list behind a count, keeping the tab and filters. */
export const listHref = (c: Ctx, key: string) => `/admin/usage?tab=${c.tab}&range=${c.range}${c.includeTest ? "&test=1" : ""}&list=${key}#list`;
