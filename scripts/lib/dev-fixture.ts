import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";

// Throwaway parties for dev walks (is_test users under their own accounts). cleanup() removes everything they made.
const TAG = `devwalk-${Date.now().toString(36)}`;
export const made = { accounts: [] as string[], users: [] as string[], persons: [] as string[], connections: [] as string[] };

export type Party = { viewer: Viewer; personId: string; pAccountId: string; profileId: string | null; email: string };

export async function party(kind: "BUYER" | "PROVIDER", first: string): Promise<Party> {
  const acct = await prisma.pAccount.create({ data: { kind, name: `${TAG} ${first}` }, select: { id: true } });
  const co = await prisma.company.create({ data: { p_account_id: acct.id, name: `${TAG} ${first} Co` }, select: { id: true } });
  const email = `${TAG}-${first.toLowerCase()}@example.test`;
  const user = await prisma.user.create({ data: { email, first_name: first, last_name: "Walk", is_test: true, is_active: true }, select: { id: true } });
  const person = await prisma.person.create({ data: { user_id: user.id, company_id: co.id, first_name: first, last_name: "Walk" }, select: { id: true } });
  const profile = kind === "PROVIDER" ? await prisma.providerProfile.create({ data: { person_id: person.id }, select: { id: true } }) : null;
  made.accounts.push(acct.id);
  made.users.push(user.id);
  made.persons.push(person.id);
  return {
    viewer: { userId: user.id, role: "user", isSystemAdmin: false, isAdmin: false, isServiceBuyer: kind === "BUYER", isServiceProvider: kind === "PROVIDER", isServiceCoordinator: false, isSupport: false, pAccountId: acct.id },
    personId: person.id,
    pAccountId: acct.id,
    profileId: profile?.id ?? null,
    email,
  };
}

export async function cleanup() {
  const orders = (await prisma.workOrder.findMany({ where: { OR: [{ buyer_person_id: { in: made.persons } }, { provider_person_id: { in: made.persons } }] }, select: { id: true } })).map((o) => o.id);
  const requests = (await prisma.workRequest.findMany({ where: { buyer_person_id: { in: made.persons } }, select: { id: true } })).map((r) => r.id);
  const settlements = (await prisma.settlementRequest.findMany({ where: { work_order_id: { in: orders } }, select: { id: true } })).map((s) => s.id);
  await prisma.erpMessage.deleteMany({ where: { OR: [{ work_order_id: { in: orders } }, { work_request_id: { in: requests } }, { settlement_request_id: { in: settlements } }, { connection_id: { in: made.connections } }] } });
  await prisma.erpConnection.deleteMany({ where: { id: { in: made.connections } } });
  await prisma.settlementRequest.deleteMany({ where: { id: { in: settlements } } });
  await prisma.workOrderRevision.deleteMany({ where: { work_order_id: { in: orders } } });
  await prisma.workOrderEvent.deleteMany({ where: { work_order_id: { in: orders } } });
  await prisma.onboardingRequest.deleteMany({ where: { work_order_id: { in: orders } } });
  await prisma.workRequestLine.updateMany({ where: { work_request_id: { in: requests } }, data: { work_order_id: null } });
  await prisma.workOrder.deleteMany({ where: { id: { in: orders } } });
  await prisma.workRequest.deleteMany({ where: { id: { in: requests } } });
  await prisma.notification.deleteMany({ where: { person_id: { in: made.persons } } });
  await prisma.providerService.deleteMany({ where: { provider_profile_id: { in: (await prisma.providerProfile.findMany({ where: { person_id: { in: made.persons } }, select: { id: true } })).map((p) => p.id) } } });
  await prisma.user.deleteMany({ where: { id: { in: made.users }, is_test: true } });
  await prisma.pAccount.deleteMany({ where: { id: { in: made.accounts } } });
}

let failures = 0;
export function check(label: string, ok: boolean, detail?: string) {
  if (!ok) failures++;
  console.log(`${ok ? "  ✓" : "  ✗"} ${label}${!ok && detail ? ` — ${detail}` : ""}`);
}
export function done(name: string) {
  console.log(failures ? `${name} — ${failures} FAILED` : `${name} — all passed`);
  return failures;
}
export async function refuses(label: string, fn: () => Promise<unknown>, includes?: string) {
  try {
    await fn();
    check(label, false, "was allowed");
  } catch (e) {
    const m = (e as Error).message;
    check(label, includes ? m.includes(includes) : true, m);
  }
}
