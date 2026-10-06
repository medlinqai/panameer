import { prisma } from "@/lib/prisma";
import { SourcingError } from "@/lib/sourcing";
import type { Viewer } from "@/lib/access";

async function ownPerson(viewer: Viewer) {
  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: { id: true },
  });
  if (!person) throw new SourcingError("No person for this account.", "NOT_FOUND");
  return person;
}

async function assertOwnsRequest(workRequestId: string, personId: string) {
  const wr = await prisma.workRequest.findUnique({
    where: { id: workRequestId },
    select: { id: true, buyer_person_id: true },
  });
  if (!wr) throw new SourcingError("That work request doesn't exist.", "NOT_FOUND");
  if (wr.buyer_person_id !== personId) {
    throw new SourcingError("That work request isn't yours.", "NOT_YOURS");
  }
  return wr;
}

async function shortlistFor(workRequestId: string, personId: string) {
  const existing = await prisma.shortlist.findFirst({
    where: { work_request_id: workRequestId },
    select: { id: true },
  });
  if (existing) return existing;
  return prisma.shortlist.create({
    data: {
      shortlist_number: `SL-${Date.now().toString(36).toUpperCase()}-${workRequestId.slice(0, 4)}`,
      work_request_id: workRequestId,
      created_by_person_id: personId,
    },
    select: { id: true },
  });
}

export type Suggestion = { providerPersonId: string; note?: string | null };

/** REPLACE THE SEARCH'S SUGGESTIONS. THIS IS THE FUNCTION THE COLUMN EXISTS FOR. */
export async function replaceSuggestions(
  viewer: Viewer,
  workRequestId: string,
  suggestions: Suggestion[]
): Promise<{ shortlistId: string; suggested: number; kept: number }> {
  const me = await ownPerson(viewer);
  await assertOwnsRequest(workRequestId, me.id);
  const sl = await shortlistFor(workRequestId, me.id);

  return prisma.$transaction(async (tx) => {
    /* SCOPED TO `SUGGESTED` AND TO THIS SHORTLIST. Never a bare deleteMany. */
    await tx.shortlistLine.deleteMany({
      where: { shortlist_id: sl.id, source: "SUGGESTED" },
    });

    // THE SURVIVORS decide what may be re-suggested, and they are read AFTER the delete
    const kept = await tx.shortlistLine.findMany({
      where: { shortlist_id: sl.id },
      select: { provider_person_id: true, line_number: true },
    });
    const keptIds = new Set(kept.map((k) => k.provider_person_id));
    let next = kept.reduce((m, k) => Math.max(m, k.line_number), 0);

    const fresh = suggestions.filter((s) => !keptIds.has(s.providerPersonId));
    if (fresh.length) {
      await tx.shortlistLine.createMany({
        data: fresh.map((s) => ({
          shortlist_id: sl.id,
          line_number: ++next,
          provider_person_id: s.providerPersonId,
          /* THE REASON THIS PROVIDER WAS SUGGESTED. `note` carries it (94e). */
          note: s.note ?? null,
          source: "SUGGESTED" as const,
        })),
      });
    }
    return { shortlistId: sl.id, suggested: fresh.length, kept: kept.length };
  });
}

/** THE BUYER KEEPS ONE. `SUGGESTED` → `SHORTLISTED`, which takes it out of the */
export async function keepProvider(
  viewer: Viewer,
  input: { workRequestId: string; providerPersonId: string; note?: string | null }
): Promise<{ id: string; source: "SHORTLISTED" }> {
  const me = await ownPerson(viewer);
  await assertOwnsRequest(input.workRequestId, me.id);
  const sl = await prisma.shortlist.findFirst({
    where: { work_request_id: input.workRequestId },
    select: { id: true },
  });
  if (!sl) throw new SourcingError("There is no shortlist on that request.", "NOT_FOUND");
  const line = await prisma.shortlistLine.findUnique({
    where: {
      shortlist_id_provider_person_id: {
        shortlist_id: sl.id,
        provider_person_id: input.providerPersonId,
      },
    },
    select: { id: true },
  });
  if (!line) throw new SourcingError("That provider isn't on the list.", "NOT_FOUND");
  await prisma.shortlistLine.update({
    where: { id: line.id },
    data: { source: "SHORTLISTED", ...(input.note != null ? { note: input.note } : {}) },
  });
  return { id: line.id, source: "SHORTLISTED" };
}

/** STRAIGHT ONTO THE REQUEST, SKIPPING THE SHORTLIST — THE COMMONEST PATH. */
export async function addProvider(
  viewer: Viewer,
  input: { workRequestId: string; providerPersonId: string; note?: string | null }
): Promise<{ id: string; source: "ADDED" }> {
  const me = await ownPerson(viewer);
  await assertOwnsRequest(input.workRequestId, me.id);
  const sl = await shortlistFor(input.workRequestId, me.id);
  const last = await prisma.shortlistLine.findFirst({
    where: { shortlist_id: sl.id },
    orderBy: { line_number: "desc" },
    select: { line_number: true },
  });
  const row = await prisma.shortlistLine.upsert({
    where: {
      shortlist_id_provider_person_id: {
        shortlist_id: sl.id,
        provider_person_id: input.providerPersonId,
      },
    },
    // AN UPSERT, BECAUSE A PROVIDER ALREADY SUGGESTED MAY BE ADDED DIRECTLY — and
    update: { source: "ADDED", ...(input.note != null ? { note: input.note } : {}) },
    create: {
      shortlist_id: sl.id,
      line_number: (last?.line_number ?? 0) + 1,
      provider_person_id: input.providerPersonId,
      note: input.note ?? null,
      source: "ADDED",
    },
    select: { id: true },
  });
  return { id: row.id, source: "ADDED" };
}
