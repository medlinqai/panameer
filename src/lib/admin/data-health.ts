/**
 * DATA HEALTH — row counts, the change since yesterday, and the real/test split
 * (`P2-ALL-E814`).
 *
 * Scott's trigger for this whole lane: his `test2*` search found nothing,
 * because a 2026-09-20 reset had deleted 203 users and NOTHING IN THE APP SHOWED
 * THAT. A count the app can show is the point.
 */
import { prisma } from "@/lib/prisma";

/** The tables worth watching, in the order the page lists them. */
export const WATCHED = [
  "users",
  "people",
  "provider_profiles",
  "connections",
  "work_requests",
  "work_orders",
  "settlement_requests",
  "payments",
  "plan_rows",
  "work_tracker_followers",
  "support_tickets",
  "notifications",
] as const;

export type HealthRow = {
  table: string;
  total: number;
  real: number | null;
  test: number | null;
  /** Change since the most recent snapshot BEFORE today, or null with no history. */
  change: number | null;
  since: string | null;
};

/* Each table's live count, and its real/test split where it has one. `is_test`
   lives on `users`; a person is test when their user is. */
async function counts(): Promise<Map<string, { total: number; real: number | null; test: number | null }>> {
  const [
    users, usersTest, people, peopleTest, profiles, connections, requests, orders,
    settlements, payments, planRows, followers, tickets, notifications,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { is_test: true } }),
    prisma.person.count(),
    prisma.person.count({ where: { user: { is_test: true } } }),
    prisma.providerProfile.count(),
    prisma.connection.count(),
    prisma.workRequest.count(),
    prisma.workOrder.count(),
    prisma.settlementRequest.count(),
    prisma.payment.count(),
    prisma.planRow.count(),
    prisma.workTrackerFollower.count(),
    prisma.supportTicket.count(),
    prisma.notification.count(),
  ]);
  const plain = (n: number) => ({ total: n, real: null, test: null });
  return new Map<string, { total: number; real: number | null; test: number | null }>([
    ["users", { total: users, real: users - usersTest, test: usersTest }],
    ["people", { total: people, real: people - peopleTest, test: peopleTest }],
    ["provider_profiles", plain(profiles)],
    ["connections", plain(connections)],
    ["work_requests", plain(requests)],
    ["work_orders", plain(orders)],
    ["settlement_requests", plain(settlements)],
    ["payments", plain(payments)],
    ["plan_rows", plain(planRows)],
    ["work_tracker_followers", plain(followers)],
    ["support_tickets", plain(tickets)],
    ["notifications", plain(notifications)],
  ]);
}

const today = () => new Date().toISOString().slice(0, 10);

export async function dataHealth(): Promise<HealthRow[]> {
  const live = await counts();
  /* The most recent snapshot BEFORE today, per table — "since yesterday" means
     the last day we have, not necessarily the calendar day before. */
  const prior = await prisma.dataSnapshot.findMany({
    where: { day: { lt: today() } },
    orderBy: { day: "desc" },
    select: { table_name: true, total: true, day: true },
  });
  const seen = new Map<string, { total: number; day: string }>();
  for (const p of prior) if (!seen.has(p.table_name)) seen.set(p.table_name, { total: p.total, day: p.day });

  return WATCHED.map((table) => {
    const now = live.get(table)!;
    const was = seen.get(table);
    return {
      table,
      total: now.total,
      real: now.real,
      test: now.test,
      /* null, not 0: "no history" and "no change" are different answers. */
      change: was ? now.total - was.total : null,
      since: was?.day ?? null,
    };
  });
}

/** Today's snapshot, written once a day. Idempotent — re-running overwrites. */
export async function recordSnapshot(): Promise<number> {
  const live = await counts();
  const day = today();
  for (const [table, c] of live) {
    await prisma.dataSnapshot.upsert({
      where: { day_table_name: { day, table_name: table } },
      create: { day, table_name: table, total: c.total, real_count: c.real, test_count: c.test },
      update: { total: c.total, real_count: c.real, test_count: c.test },
    });
  }
  return live.size;
}
