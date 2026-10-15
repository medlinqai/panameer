// BD walk: a new buyer with a pending company join → buyer road (6 stops), company stop "Waiting for approval", Next = Find a Provider.
import { prisma } from "@/lib/prisma";
import { party, cleanup, check, done, made } from "./lib/dev-fixture";
import { lifecycleFor } from "@/lib/your-path";

async function main() {
  const owner = await party("BUYER", "Olu");
  const co = await prisma.company.findFirstOrThrow({ where: { p_account_id: owner.pAccountId }, select: { id: true } });
  await prisma.companyMembership.create({ data: { person_id: owner.personId, company_id: co.id, role: "ADMIN", status: "APPROVED" } });
  const b = await party("BUYER", "Bonnie");
  await prisma.requesterProfile.create({ data: { person_id: b.personId, completed_at: new Date() } });
  await prisma.companyMembership.create({ data: { person_id: b.personId, company_id: co.id, role: "MEMBER", status: "PENDING" } });
  const p = await lifecycleFor(b.personId);
  check("buyer road: 6 stops", p?.road === "buyer" && p.steps.length === 6);
  check("pending join: company stop counts done, Waiting for approval", p?.done[1] === true && p.waiting?.key === "link" && p.waiting.label === "Waiting for approval");
  check("Next: Find a Provider (not Add Your Company)", p?.steps[p.current]?.key === "find", p?.steps[p!.current]?.key);
  const o = await lifecycleFor(owner.personId);
  check("approved owner: no waiting", o?.road === "buyer" && !o.waiting && o.done[1]);
}

main()
  .catch((e) => check("walk threw", false, (e as Error).stack))
  .finally(async () => {
    await prisma.requesterProfile.deleteMany({ where: { person_id: { in: made.persons } } });
    await prisma.companyMembership.deleteMany({ where: { person_id: { in: made.persons } } });
    await cleanup();
    check("throwaway rows removed", (await prisma.person.count({ where: { id: { in: made.persons } } })) === 0);
    process.exitCode = done("BD walk");
    await prisma.$disconnect();
  });
