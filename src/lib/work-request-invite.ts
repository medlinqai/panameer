import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications";
import type { Viewer } from "@/lib/access";
import { assertIssuable } from "@/lib/sourcing";
import { loadOwned, resolveBuyer, WorkRequestError } from "@/lib/work-request";

/**
 * INVITE NAMED PROVIDERS TO BID ON A LINE (`P1-J4-E392` WS-3).
 *
 * ── ⚠⚠ THE FENCE, AND IT IS THE WHOLE SHAPE OF THIS FILE ────────────────────
 *
 * **THIS CREATES THE INVITE AND NOTHING MORE.** No bid list, no comparison
 * screen, no scoring, no shortlist, no tests, no interviews — every one of those
 * is its own brief, and `E395` built the models they will write to.
 *
 * ⚠ SO NOTHING IN THIS FILE READS `Proposal`. It writes `ProposalRequest` +
 * `ProposalRequestLine` and it counts invitations. `check:hire` asserts the absence,
 * because "just show whether they replied" is one `include` away and is the
 * beginning of the bid screen.
 *
 * ⚠ WS-3 IS IN SCOPE ONLY BECAUSE `E395` LANDED. The brief made it conditional —
 * *"do not invent an invite flow with nowhere to write"* — and `ProposalRequest` is on
 * main at `54d272b`, so it has somewhere to write.
 */

/** ⚠ Same alphabet as the support ticket code, and for the same reason: a person
    reads this number back. `I`, `O`, `0` and `1` are absent. */
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
  /** ⚠ REQUIRED TO ISSUE. See `assertIssuable`. */
  respondsBy: string | null;
  message?: string | null;
};

export type InviteResult = {
  created: { providerPersonId: string; requestNumber: string }[];
  /** ⚠ Already invited — reported, not treated as a failure. See below. */
  alreadyInvited: string[];
};

/**
 * Issue one ITB per named provider.
 *
 * ⚠⚠ ONE ITB PER PROVIDER, WHICH IS `E395`'s `@@unique([work_request_id,
 * provider_person_id])`. The fan-out is the document, not a list inside one — so
 * this loops and creates N rows rather than creating one row with N providers.
 *
 * ⚠ RE-INVITING SOMEBODY IS NOT AN ERROR, IT IS A NO-OP THAT SAYS SO. A buyer
 * who invites five providers and then invites a sixth by selecting all six must
 * not get a wall of "already invited" and no sixth invitation. The unique
 * constraint decides; the result reports both halves.
 *
 * ⚠ AND THE LINE IS NAMED ON THE ITB. `ProposalRequestLine.work_request_line_id` is
 * why — not every ITB covers every line, and a request for a DBA and a developer
 * goes out as two different invitations naming two different lines.
 */
export async function inviteProviders(
  viewer: Viewer,
  workRequestId: string,
  input: InviteInput
): Promise<InviteResult> {
  const { personId, pAccountId } = await resolveBuyer(viewer);
  const wr = await loadOwned(viewer, workRequestId, pAccountId);

  /* ⚠ THE LINE MUST BELONG TO THE REQUEST THE VIEWER OWNS. The client supplies a
     line id; ownership is proved by the join, never by the id. */
  const line = await prisma.workRequestLine.findFirst({
    where: { id: input.lineId, work_request_id: wr.id },
    select: { id: true },
  });
  if (!line) throw new WorkRequestError("Line not found", "NOT_FOUND");

  /* ⚠⚠ A BID WITH NO CLOSING DATE NEVER CLOSES — `E395`'s rule, enforced by
     `E395`'s function rather than restated here. */
  const respondsBy = input.respondsBy ? new Date(input.respondsBy) : null;
  assertIssuable({ responds_by: respondsBy });
  if (respondsBy && respondsBy.getTime() < Date.now())
    throw new WorkRequestError("The closing date is in the past", "INVALID");

  const ids = [...new Set(input.providerPersonIds)].filter(Boolean);
  if (ids.length === 0) throw new WorkRequestError("Choose at least one provider", "INVALID");

  /* ⚠ EVERY INVITEE MUST ACTUALLY BE A PROVIDER — checked here, not assumed from
     the picker. The picker is a convenience; this is the boundary. */
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
          /* ⚠ THE INVITER IS RESOLVED FROM THE SESSION. Never from input. */
          invited_by_person_id: personId,
          issued_at: new Date(),
          responds_by: respondsBy,
          status: "ISSUED",
          message: input.message?.trim() || null,
          lines: { create: [{ line_number: 1, work_request_line_id: line.id }] },
        },
      });
      created.push({ providerPersonId, requestNumber });

      /*
        ── ⚠⚠⚠ THE BELL ENTRY (`P2-A8-E680`, ruling 86) ────────────────────

        ⚠⚠ **THIS WRITER SHIPPED WITHOUT ONE.** `proposalRequest.create` has been
        running from a reachable page all along and **the invited provider was
        never told** — no bell row, nothing on their worklist. It is the one
        piece of WS-B that was missing; the match and the invite were already
        built.

        ⚠ **INSIDE THE LOOP AND AFTER THE ROW**, so a provider is notified only
        about an invitation that actually exists, and a re-invite (the `continue`
        above) notifies nobody twice.
        ⚠⚠ **`notify()` NEVER THROWS INTO THIS CALLER** — it catches, logs and
        continues by its own contract, so a notification outage cannot cost a
        buyer their invitations. Awaited for ordering, not for safety.
        ⚠⚠⚠ **NO SENDER.** Ruling 86: `notify()` writes the entry and has no
        email half; `86c`/`86e` are Scott's open decision. Nothing here sends.

        ⚠⚠ **NO BUYER NAME IS PASSED, AND THAT IS DELIBERATE.** `WorkRequest`
        carries `company_visibility` / `company_code_name`, and
        `buildBuyerIdentity` is the ONE redaction that decides what a provider
        may see. ⚠⚠⚠ **A notification is precisely where that rule would be
        bypassed** — the provider's bell is outside the page that applies it.
        Re-implementing the redaction here would be a second definition
        (`E585`) of the rule `check:work-request-identity` guards with 54
        assertions. So the title falls back to *"A buyer"*, which is true for
        both visibilities. ⚠ Passing the name safely means passing
        `buildBuyerIdentity`'s OUTPUT, and that is a change to this function's
        query — reported, not smuggled in.
      */
      await notify({
        event: "work.invited_to_propose",
        personId: providerPersonId,
        entityType: "ProposalRequest",
        entityId: wr.id,
        /* ⚠ ONE ENTRY PER (PROVIDER × REQUEST). Re-inviting after a decline
           must not stack a second identical row on their worklist. */
        dedupeKey: `work.invited_to_propose:${wr.id}:${providerPersonId}`,
        vars: { workTitle: wr.title, requestId: wr.id },
      });
    } catch {
      /* ⚠ THE UNIQUE CONSTRAINT IS THE ARBITER UNDER A RACE. Two concurrent
         invites of the same provider: the second lands here and is reported as
         already invited, which is the truth. */
      already.add(providerPersonId);
    }
  }

  /* ⚠ MARK THE LINE AS BEING SOURCED — but only from DRAFT. A line already
     ASSIGNED to somebody is not walked backwards by inviting a second opinion. */
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

/**
 * Who has already been invited on this request.
 *
 * ⚠⚠ THIS RETURNS THE INVITATIONS, NOT THE RESPONSES. There is deliberately no
 * `status` of the bid here and no `include: { proposal: true }` — see the fence at the
 * top of the file. A buyer looking at this page learns who was asked; what came
 * back is the bid screen's job and the bid screen is not this brief.
 */
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
