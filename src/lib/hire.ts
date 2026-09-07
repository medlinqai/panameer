import { prisma } from "@/lib/prisma";
import { scopedToPAccount, withPAccount, type Viewer } from "@/lib/access";
import { resolveBuyer } from "@/lib/work-request";
import { completenessFor, type Completeness } from "@/lib/work-request-lines";

/**
 * `/hire` — THE REQUESTER'S LIST OF WORK REQUESTS (`P1-J4-E392` WS-1).
 *
 * ⚠⚠ THE HOLE THIS FILLS: a requester could create a work request and then had
 * NOWHERE TO LOOK AT IT. `/create-work` resumed the most recent DRAFT and
 * `/work-requests/[id]/share` existed, but nothing listed what you had made.
 *
 * ⚠ `Work Requests` IS THE JOURNEY'S NAME AND `Hire` IS THE RAIL'S WORD — `E378`
 * settled that: *the rail says which journey in one word, the tabs say which
 * slice, and the page heading says the journey's name.* So the `<h1>` here reads
 * "Work Requests" even though the rail item reads "Hire".
 */

export type WorkRequestRow = {
  id: string;
  title: string;
  status: string;
  postedAt: string | null;
  updatedAt: string;
  currency: string;
  budgetType: string | null;
  budgetAmountCents: number | null;
  budgetMinCents: number | null;
  budgetMaxCents: number | null;
  startDate: string | null;
  endDate: string | null;
  lineCount: number;
  /** ⚠ Distinct names, in line order. A request with three lines on one provider
      says that provider once, not three times. */
  providerNames: string[];
  completeness: Completeness;
};

/**
 * Every work request this buyer's P-Account owns, newest first.
 *
 * ⚠⚠ P-ACCOUNT SCOPED, NOT PERSON SCOPED, and that is deliberate: a work request
 * commits a COMPANY, so a colleague on the same approved account is looking at
 * their organisation's requests rather than only their own. `scopedToPAccount`
 * is the fence and it throws rather than running unscoped.
 *
 * ⚠ THREE QUERIES, FIXED — the requests, their lines, and the provider names —
 * never one per row. The list is the surface most likely to grow.
 */
export async function listWorkRequests(viewer: Viewer): Promise<WorkRequestRow[]> {
  const { pAccountId } = await resolveBuyer(viewer);
  const scoped = withPAccount(viewer, pAccountId);

  const requests = await prisma.workRequest.findMany({
    where: scopedToPAccount(scoped, {}),
    orderBy: [{ updated_at: "desc" }],
    select: {
      id: true,
      title: true,
      status: true,
      posted_at: true,
      updated_at: true,
      currency: true,
      budget_type: true,
      budget_amount_cents: true,
      budget_min_cents: true,
      budget_max_cents: true,
      start_date: true,
      end_date: true,
    },
  });
  if (requests.length === 0) return [];

  const lines = await prisma.workRequestLine.findMany({
    where: { work_request_id: { in: requests.map((r) => r.id) } },
    select: {
      work_request_id: true,
      line_number: true,
      description: true,
      provider_person_id: true,
      basis: true,
      unit_price_cents: true,
      amount_cents: true,
    },
    orderBy: { line_number: "asc" },
  });

  const names = await namesFor(
    lines.map((l) => l.provider_person_id).filter((x): x is string => !!x)
  );

  const byRequest = new Map<string, typeof lines>();
  for (const l of lines) {
    const list = byRequest.get(l.work_request_id) ?? [];
    list.push(l);
    byRequest.set(l.work_request_id, list);
  }

  return requests.map((r) => {
    const mine = byRequest.get(r.id) ?? [];
    const providerNames: string[] = [];
    for (const l of mine) {
      if (!l.provider_person_id) continue;
      const name = names.get(l.provider_person_id);
      if (name && !providerNames.includes(name)) providerNames.push(name);
    }
    return {
      id: r.id,
      title: r.title,
      status: r.status,
      postedAt: r.posted_at ? r.posted_at.toISOString() : null,
      updatedAt: r.updated_at.toISOString(),
      currency: r.currency,
      budgetType: r.budget_type,
      budgetAmountCents: r.budget_amount_cents,
      budgetMinCents: r.budget_min_cents,
      budgetMaxCents: r.budget_max_cents,
      startDate: r.start_date ? r.start_date.toISOString().slice(0, 10) : null,
      endDate: r.end_date ? r.end_date.toISOString().slice(0, 10) : null,
      lineCount: mine.length,
      providerNames,
      /* ⚠ THE SAME FUNCTION THE DETAIL PAGE AND THE API READ. The list's "2 of 3
         lines ready" and the detail page's Complete button cannot disagree,
         because there is one rule and this is a call to it. */
      completeness: completenessFor(mine),
    };
  });
}

async function namesFor(personIds: string[]): Promise<Map<string, string>> {
  const ids = [...new Set(personIds)];
  if (ids.length === 0) return new Map();
  const people = await prisma.person.findMany({
    where: { id: { in: ids } },
    select: { id: true, first_name: true, last_name: true },
  });
  return new Map(
    people.map((p) => [p.id, [p.first_name, p.last_name].filter(Boolean).join(" ").trim()])
  );
}
