import type { WorkRequestStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { scopedToPAccount, withPAccount, type Viewer } from "@/lib/access";
import { resolveBuyer } from "@/lib/work-request";
import { completenessFor, type Completeness } from "@/lib/work-request-lines";

export type WorkRequestRow = {
  id: string;
  title: string;
  status: WorkRequestStatus;
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
  providerNames: string[];
  completeness: Completeness;
};

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
      transaction_type: true,
      unit_price_cents: true,
      amount_cents: true,
    },
    orderBy: { line_number: "asc" },
  });

  const shortlists = await prisma.shortlist.findMany({
    where: { work_request_id: { in: requests.map((r) => r.id) } },
    select: { work_request_id: true, lines: { select: { provider_person_id: true } } },
  });
  const shortlisted = new Map<string, string[]>();
  for (const sl of shortlists) {
    const list = shortlisted.get(sl.work_request_id) ?? [];
    for (const l of sl.lines) if (!list.includes(l.provider_person_id)) list.push(l.provider_person_id);
    shortlisted.set(sl.work_request_id, list);
  }

  const names = await namesFor([
    ...lines.map((l) => l.provider_person_id).filter((x): x is string => !!x),
    ...[...shortlisted.values()].flat(),
  ]);

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
    for (const personId of shortlisted.get(r.id) ?? []) {
      const name = names.get(personId);
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
