import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";
import { SourcingError } from "@/lib/sourcing";
import { normalizeQuestions, type Question } from "@/lib/question-types";
import { STARTER_BANKS } from "@/lib/question-bank-starters";

// QB-E004: Question Banks — My Banks, Company Banks (shared within the buyer's account), Panameer Starters.
export type BankRow = { id: string; name: string; questions: Question[]; shared: boolean; mine: boolean; source: "mine" | "company" | "starter"; updatedAt: string | null };

async function me(viewer: Viewer) {
  const p = await prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { id: true, company: { select: { p_account_id: true } } } });
  if (!p?.company) throw new SourcingError("Add your company first.", "INVALID");
  return { personId: p.id, pAccountId: p.company.p_account_id };
}

export async function listBanks(viewer: Viewer): Promise<BankRow[]> {
  const { personId, pAccountId } = await me(viewer);
  const rows = await prisma.questionBank.findMany({ where: { OR: [{ owner_person_id: personId }, { p_account_id: pAccountId, shared: true }] }, orderBy: { updated_at: "desc" } });
  return [
    ...rows.map((r) => ({ id: r.id, name: r.name, questions: normalizeQuestions(r.questions), shared: r.shared, mine: r.owner_person_id === personId, source: (r.owner_person_id === personId ? "mine" : "company") as BankRow["source"], updatedAt: r.updated_at.toISOString() })),
    ...STARTER_BANKS.map((b) => ({ id: b.id, name: b.name, questions: b.questions, shared: false, mine: false, source: "starter" as const, updatedAt: null })),
  ];
}

export async function saveBank(viewer: Viewer, input: { id?: string | null; name: string; questions: unknown; shared?: boolean }) {
  const { personId, pAccountId } = await me(viewer);
  const name = input.name.trim().slice(0, 120);
  const questions = normalizeQuestions(input.questions);
  if (!name) throw new SourcingError("Give the bank a name.", "INVALID");
  if (!questions.length) throw new SourcingError("Add at least one question.", "INVALID");
  if (input.id) {
    const own = await prisma.questionBank.findFirst({ where: { id: input.id, owner_person_id: personId }, select: { id: true } });
    if (!own) throw new SourcingError("You can only edit your own banks — duplicate it first.", "NOT_FOUND");
    return prisma.questionBank.update({ where: { id: own.id }, data: { name, questions, shared: !!input.shared }, select: { id: true } });
  }
  return prisma.questionBank.create({ data: { owner_person_id: personId, p_account_id: pAccountId, name, questions, shared: !!input.shared }, select: { id: true } });
}

export async function deleteBank(viewer: Viewer, id: string) {
  const { personId } = await me(viewer);
  const r = await prisma.questionBank.deleteMany({ where: { id, owner_person_id: personId } });
  if (!r.count) throw new SourcingError("You can only delete your own banks.", "NOT_FOUND");
}

/** Duplicate any bank you can see (yours, your company's or a Starter) as your own. */
export async function duplicateBank(viewer: Viewer, id: string) {
  const b = (await listBanks(viewer)).find((x) => x.id === id);
  if (!b) throw new SourcingError("That bank isn't available.", "NOT_FOUND");
  return saveBank(viewer, { name: `${b.name} (Copy)`, questions: b.questions, shared: false });
}
