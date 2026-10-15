import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { OnboardingError } from "@/lib/onboarding";
import { companyLocations, ownAddress, saveOwnAddress } from "@/lib/locations";
import { companyBusinessTypeIds } from "@/lib/business-types";

// SR-E001–E004: the seller's pre-verify Company · Locations · Review state, so a refresh returns to the step.
// Privacy (as buyers): a PENDING joiner gets the company name only — no details, no addresses.
export async function GET() {
  const viewer = await guardApi("authenticated");
  if (viewer instanceof NextResponse) return viewer;
  const p = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: {
      id: true,
      user: { select: { email: true } },
      companyMemberships: { where: { status: { in: ["APPROVED", "PENDING"] } }, orderBy: { updated_at: "desc" }, take: 1, select: { status: true, role: true, company: { select: { id: true, name: true, legal_name: true, website: true, description: true } } } },
    },
  });
  if (!p) return NextResponse.json({ error: "No person" }, { status: 404 });
  const m = p.companyMemberships[0];
  const approved = m?.status === "APPROVED";
  return NextResponse.json({
    email: p.user?.email ?? "",
    company: m
      ? approved
        ? { status: m.status, owner: m.role === "ADMIN", id: m.company.id, name: m.company.name, legalName: m.company.legal_name && m.company.legal_name !== m.company.name ? m.company.legal_name : "", website: m.company.website ?? "", description: m.company.description ?? "", businessTypeIds: await companyBusinessTypeIds(m.company.id) }
        : { status: m.status, owner: false, name: m.company.name }
      : null,
    locations: approved ? await companyLocations(m.company.id) : [],
    own: await ownAddress(p.id),
  });
}

const Own = z.object({ line1: z.string().trim().max(200).nullish(), line2: z.string().trim().max(200).nullish(), city: z.string().trim().max(120).nullish(), state: z.string().trim().max(120).nullish(), postalCode: z.string().trim().max(40).nullish(), country: z.string().trim().max(80).nullish() });

/** A joiner's own work address (owners save the company's addresses via /api/company/locations). */
export async function POST(req: Request) {
  const viewer = await guardApi("authenticated");
  if (viewer instanceof NextResponse) return viewer;
  const b = z.object({ own: Own }).safeParse(await req.json().catch(() => null));
  if (!b.success) return NextResponse.json({ error: "Check the address." }, { status: 400 });
  const p = await prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { id: true } });
  if (!p) return NextResponse.json({ error: "No person" }, { status: 404 });
  try {
    await saveOwnAddress(p.id, b.data.own);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof OnboardingError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
