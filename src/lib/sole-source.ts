import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";
import { createDraft, resolveBuyer } from "@/lib/work-request";
import { addProvider } from "@/lib/shortlists";

export class HireError extends Error {
  constructor(
    message: string,
    public code: "NOT_A_BUYER" | "OWN_PROFILE" | "NO_PROVIDER"
  ) {
    super(message);
  }
}

async function existingDraftFor(
  buyerPersonId: string,
  providerPersonId: string
): Promise<string | null> {
  const lines = await prisma.shortlistLine.findMany({
    where: { provider_person_id: providerPersonId },
    select: { shortlist_id: true },
  });
  if (lines.length === 0) return null;

  const shortlists = await prisma.shortlist.findMany({
    where: { id: { in: lines.map((l) => l.shortlist_id) } },
    select: { work_request_id: true },
  });
  if (shortlists.length === 0) return null;

  const draft = await prisma.workRequest.findFirst({
    where: {
      id: { in: shortlists.map((s) => s.work_request_id) },
      buyer_person_id: buyerPersonId,
      status: "DRAFT",
      sole_sourced: true,
    },
    orderBy: { updated_at: "desc" },
    select: { id: true },
  });
  return draft?.id ?? null;
}

export async function hireSoleSourced(
  viewer: Viewer,
  providerPersonId: string
): Promise<{ workRequestId: string; reopened: boolean }> {
  if (!providerPersonId) {
    throw new HireError("No provider named.", "NO_PROVIDER");
  }
  const { personId } = await resolveBuyer(viewer);

  if (personId === providerPersonId) {
    throw new HireError("You cannot hire yourself.", "OWN_PROFILE");
  }

  const existing = await existingDraftFor(personId, providerPersonId);
  if (existing) {
    return { workRequestId: existing, reopened: true };
  }

  const draft = await createDraft(viewer, undefined, undefined, { soleSourced: true });
  await addProvider(viewer, {
    workRequestId: draft.id,
    providerPersonId,
  });
  return { workRequestId: draft.id, reopened: false };
}
