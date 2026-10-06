import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications";
import type { Viewer } from "@/lib/access";
import { assertIssuable } from "@/lib/sourcing";
import { loadOwned, resolveBuyer, WorkRequestError } from "@/lib/work-request";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function newRequestNumber(): string {
  const bytes = randomBytes(6);
  let out = "";
  for (const b of bytes) out += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return `ITB-${out}`;
}

export type InviteInput = {
  /** The line the invited providers are asked to price. */
  lineId: string;
  providerPersonIds: string[];
  /** REQUIRED TO ISSUE. See `assertIssuable`. */
  respondsBy: string | null;
  message?: string | null;
};

export type InviteResult = {
  created: { providerPersonId: string; requestNumber: string }[];
  /** Already invited — reported, not treated as a failure. See below. */
  alreadyInvited: string[];
};

/** Issue one ITB per named provider. */
export async function inviteProviders(
  viewer: Viewer,
  workRequestId: string,
  input: InviteInput
): Promise<InviteResult> {
  const { personId, pAccountId } = await resolveBuyer(viewer);
  const wr = await loadOwned(viewer, workRequestId, pAccountId);

  // THE LINE MUST BELONG TO THE REQUEST THE VIEWER OWNS. The client supplies a
  const line = await prisma.workRequestLine.findFirst({
    where: { id: input.lineId, work_request_id: wr.id },
    select: { id: true },
  });
  if (!line) throw new WorkRequestError("Line not found", "NOT_FOUND");

  // A BID WITH NO CLOSING DATE NEVER CLOSES — 's rule, enforced by
  const respondsBy = input.respondsBy ? new Date(input.respondsBy) : null;
  assertIssuable({ responds_by: respondsBy });
  if (respondsBy && respondsBy.getTime() < Date.now())
    throw new WorkRequestError("The closing date is in the past", "INVALID");

  const ids = [...new Set(input.providerPersonIds)].filter(Boolean);
  if (ids.length === 0) throw new WorkRequestError("Choose at least one provider", "INVALID");

  // EVERY INVITEE MUST ACTUALLY BE A PROVIDER — checked here, not assumed from
  const providers = await prisma.person.findMany({
    where: { id: { in: ids }, is_service_provider: true },
    select: { id: true },
  });
  const valid = new Set(providers.map((p) => p.id));
  const unknown = ids.filter((i) => !valid.has(i));
  if (unknown.length)
    throw new WorkRequestError("One of those people is not a service provider", "INVALID");

  const existing = await prisma.proposalRequest.findMany({
    where: { work_request_id: wr.id, provider_person_id: { in: ids } },
    select: { provider_person_id: true },
  });
  const already = new Set(existing.map((e) => e.provider_person_id));

  const created: InviteResult["created"] = [];
  for (const providerPersonId of ids) {
    if (already.has(providerPersonId)) continue;
    const requestNumber = newRequestNumber();
    try {
      await prisma.proposalRequest.create({
        data: {
          request_number: requestNumber,
          work_request_id: wr.id,
          provider_person_id: providerPersonId,
          /* THE INVITER IS RESOLVED FROM THE SESSION. Never from input. */
          invited_by_person_id: personId,
          issued_at: new Date(),
          responds_by: respondsBy,
          status: "ISSUED",
          message: input.message?.trim() || null,
          lines: { create: [{ line_number: 1, work_request_line_id: line.id }] },
        },
      });
      created.push({ providerPersonId, requestNumber });

      // THE BELL ENTRY , ruling 86)
      await notify({
        event: "work.invited_to_propose",
        personId: providerPersonId,
        entityType: "ProposalRequest",
        entityId: wr.id,
        // ONE ENTRY PER (PROVIDER × REQUEST). Re-inviting after a decline
        dedupeKey: `work.invited_to_propose:${wr.id}:${providerPersonId}`,
        vars: { workTitle: wr.title, requestId: wr.id },
      });
    } catch {
      // THE UNIQUE CONSTRAINT IS THE ARBITER UNDER A RACE. Two concurrent
      already.add(providerPersonId);
    }
  }

  // MARK THE LINE AS BEING SOURCED — but only from DRAFT. A line already
  if (created.length)
    await prisma.workRequestLine.updateMany({
      where: { id: line.id, status: "DRAFT" },
      data: { status: "SOURCING" },
    });

  return { created, alreadyInvited: [...already] };
}

export type InvitedProvider = {
  personId: string;
  name: string;
  requestNumber: string;
  lineNumber: number;
  respondsBy: string | null;
};

/** Who has already been invited on this request. */
export async function invitedOn(
  viewer: Viewer,
  workRequestId: string
): Promise<InvitedProvider[]> {
  const { pAccountId } = await resolveBuyer(viewer);
  const wr = await loadOwned(viewer, workRequestId, pAccountId);

  const rows = await prisma.proposalRequest.findMany({
    where: { work_request_id: wr.id },
    select: {
      provider_person_id: true,
      request_number: true,
      responds_by: true,
      lines: { select: { work_request_line_id: true }, take: 1 },
    },
    orderBy: { created_at: "asc" },
  });
  if (rows.length === 0) return [];

  const [people, lines] = await Promise.all([
    prisma.person.findMany({
      where: { id: { in: rows.map((r) => r.provider_person_id) } },
      select: { id: true, first_name: true, last_name: true },
    }),
    prisma.workRequestLine.findMany({
      where: { work_request_id: wr.id },
      select: { id: true, line_number: true },
    }),
  ]);
  const nameOf = new Map(
    people.map((p) => [p.id, [p.first_name, p.last_name].filter(Boolean).join(" ").trim()])
  );
  const numberOf = new Map(lines.map((l) => [l.id, l.line_number]));

  return rows.map((r) => ({
    personId: r.provider_person_id,
    name: nameOf.get(r.provider_person_id) ?? "A provider",
    requestNumber: r.request_number,
    lineNumber: numberOf.get(r.lines[0]?.work_request_line_id ?? "") ?? 1,
    respondsBy: r.responds_by ? r.responds_by.toISOString().slice(0, 10) : null,
  }));
}
