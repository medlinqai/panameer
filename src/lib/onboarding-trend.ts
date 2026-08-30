import { prisma } from "@/lib/prisma";
import {
  ONBOARDING_STATUSES,
  type OnboardingStatus,
} from "@/lib/onboarding-status";

/**
 * WHEN PEOPLE ENTERED EACH ONBOARDING STATUS (`P1-J1.1-E257`).
 *
 * ⚠⚠ THESE ARE STATE TIMESTAMPS, NOT EVENTS, AND THE DIFFERENCE IS VISIBLE IN
 * THE OUTPUT. There is no event log in this schema and `E257` is explicit that
 * one must not be added here. Every series below is built from a column that
 * records WHEN A THING BECAME TRUE and is then overwritten or left alone —
 * so three things are true of every chart this produces:
 *
 *   1. A USER WHO MOVED BACKWARDS IS NOT CAPTURED. If somebody reached
 *      Complete and was later reset, only the current state exists; the trend
 *      shows their most recent stamp and nothing about the round trip.
 *   2. IT IS "ENTERED AND IS STILL AT OR PAST", NOT "ENTERED". Somebody who is
 *      Validated today also has a `created_at`, so they appear in the Created
 *      series too. The four series are cumulative-by-nature, not exclusive
 *      buckets — which is the honest reading of state columns and is stated on
 *      the page.
 *   3. ONE STAMP PER PERSON PER STATUS. A column cannot hold a history.
 *
 * ⚠ THE ALTERNATIVE WAS AN EVENTS TABLE AND IT IS EXPLICITLY OUT OF SCOPE.
 * Reported rather than built.
 */

export type Period = "day" | "week" | "month";
export const PERIODS: Period[] = ["day", "week", "month"];

export type TrendPoint = { key: string; label: string; count: number };
export type TrendSeries = {
  status: OnboardingStatus;
  period: Period;
  points: TrendPoint[];
  total: number;
  /** Which columns fed this series — printed on the page so it is auditable. */
  sources: string[];
  /** Statuses whose seller or buyer half has no column to read. */
  missing: string[];
};

function bucket(d: Date, p: Period): { key: string; label: string } {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  if (p === "month") {
    return {
      key: `${y}-${String(m + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("en-GB", {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }),
    };
  }
  if (p === "week") {
    /* Week starting Monday, so a bucket never straddles two labels. */
    const t = new Date(Date.UTC(y, m, d.getUTCDate()));
    const dow = (t.getUTCDay() + 6) % 7;
    t.setUTCDate(t.getUTCDate() - dow);
    return {
      key: t.toISOString().slice(0, 10),
      label: `w/c ${t.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })}`,
    };
  }
  const t = new Date(Date.UTC(y, m, d.getUTCDate()));
  return {
    key: t.toISOString().slice(0, 10),
    label: t.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    }),
  };
}

/** Every bucket between first and last, so an empty period is a GAP, not a skip. */
function fill(points: Map<string, number>, p: Period): TrendPoint[] {
  const keys = [...points.keys()].sort();
  if (keys.length === 0) return [];
  const out: TrendPoint[] = [];
  const step = (d: Date) => {
    if (p === "month") d.setUTCMonth(d.getUTCMonth() + 1);
    else if (p === "week") d.setUTCDate(d.getUTCDate() + 7);
    else d.setUTCDate(d.getUTCDate() + 1);
  };
  const parse = (k: string) => (p === "month" ? new Date(`${k}-01T00:00:00Z`) : new Date(`${k}T00:00:00Z`));
  const cur = parse(keys[0]);
  const end = parse(keys[keys.length - 1]);
  /* 400 buckets is a hard stop — a daily view over years would otherwise build
     an unbounded array and render an unreadable axis. */
  for (let i = 0; cur <= end && i < 400; i++) {
    const b = bucket(cur, p);
    out.push({ key: b.key, label: b.label, count: points.get(b.key) ?? 0 });
    step(cur);
  }
  return out;
}

export async function getStatusTrend(
  status: OnboardingStatus,
  period: Period
): Promise<TrendSeries> {
  const stamps: Date[] = [];
  const sources: string[] = [];
  const missing: string[] = [];

  if (status === "Created") {
    const rows = await prisma.person.findMany({ select: { created_at: true } });
    rows.forEach((r) => stamps.push(r.created_at));
    sources.push("Person.created_at (both sides)");
  } else if (status === "In-Process") {
    const [rp, pp] = await Promise.all([
      prisma.requesterProfile.findMany({ select: { created_at: true } }),
      prisma.providerProfile.findMany({ select: { created_at: true } }),
    ]);
    rp.forEach((r) => stamps.push(r.created_at));
    pp.forEach((r) => stamps.push(r.created_at));
    sources.push("RequesterProfile.created_at (buyer)", "ProviderProfile.created_at (seller)");
  } else if (status === "Complete") {
    const [rp, pp] = await Promise.all([
      prisma.requesterProfile.findMany({
        where: { completed_at: { not: null } },
        select: { completed_at: true },
      }),
      prisma.providerProfile.findMany({
        where: { onboarding_completed_at: { not: null } },
        select: { onboarding_completed_at: true },
      }),
    ]);
    rp.forEach((r) => r.completed_at && stamps.push(r.completed_at));
    pp.forEach((r) => r.onboarding_completed_at && stamps.push(r.onboarding_completed_at));
    sources.push(
      "RequesterProfile.completed_at (buyer)",
      "ProviderProfile.onboarding_completed_at (seller)"
    );
  } else {
    /*
      ⚠ THIS IS THE SERIES `E257` STOPPED ON THE FIRST TIME. The buyer half had
      NO column, so `Validated` could not be trended and inventing one was
      explicitly forbidden. `E269b` added `RequesterProfile.validated_at` on
      Scott's instruction, which is what unblocked this.
      ⚠ IT WILL READ ZERO ON THE BUYER SIDE UNTIL SOMETHING SETS IT — there is
      still no buyer validation mechanism, by design.
    */
    const [rp, pp] = await Promise.all([
      prisma.requesterProfile.findMany({
        where: { validated_at: { not: null } },
        select: { validated_at: true },
      }),
      prisma.providerProfile.findMany({
        where: { validated_at: { not: null } },
        select: { validated_at: true },
      }),
    ]);
    rp.forEach((r) => r.validated_at && stamps.push(r.validated_at));
    pp.forEach((r) => r.validated_at && stamps.push(r.validated_at));
    sources.push(
      "RequesterProfile.validated_at (buyer, E269b)",
      "ProviderProfile.validated_at (seller)"
    );
  }

  const counts = new Map<string, number>();
  for (const d of stamps) {
    const b = bucket(d, period);
    counts.set(b.key, (counts.get(b.key) ?? 0) + 1);
  }
  return {
    status,
    period,
    points: fill(counts, period),
    total: stamps.length,
    sources,
    missing,
  };
}

/** All four series — the "across all steps" view `E257` asks for. */
export async function getAllTrends(period: Period): Promise<TrendSeries[]> {
  return Promise.all(ONBOARDING_STATUSES.map((s) => getStatusTrend(s, period)));
}
