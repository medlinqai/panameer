import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { getCompanyBinding } from "@/lib/company";
import { OnboardingError } from "@/lib/onboarding";
import { companyLocations, isSellerCompany, saveCompanyLocations } from "@/lib/locations";
import { prisma } from "@/lib/prisma";

const Loc = z.object({
  id: z.string().uuid().nullish(),
  line1: z.string().trim().max(200).nullish(), line2: z.string().trim().max(200).nullish(), city: z.string().trim().max(120).nullish(),
  state: z.string().trim().max(120).nullish(), postalCode: z.string().trim().max(40).nullish(), country: z.string().trim().max(80).nullish(),
  corporate: z.boolean(), billTo: z.boolean(), shipTo: z.boolean(), remitTo: z.boolean(),
});
const Body = z.union([
  z.object({ locations: z.array(Loc).min(1).max(50), seller: z.boolean().optional() }),
  z.object({ workAddressId: z.string().uuid() }),
]);

// LS-E005: Company › Addresses. Admins replace the list; any approved member picks where they work. Company from the session.
export async function GET() {
  const viewer = await guardApi("authenticated");
  if (viewer instanceof NextResponse) return viewer;
  const b = await getCompanyBinding(viewer);
  if (!b || b.status !== "APPROVED") return NextResponse.json({ locations: [] });
  return NextResponse.json({ locations: await companyLocations(b.company.id), seller: await isSellerCompany(b.company.id) });
}

export async function POST(req: Request) {
  const viewer = await guardApi("authenticated");
  if (viewer instanceof NextResponse) return viewer;
  const binding = await getCompanyBinding(viewer);
  if (!binding || binding.status !== "APPROVED") return NextResponse.json({ error: "Join a company first." }, { status: 403 });
  const p = Body.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Check the addresses." }, { status: 400 });
  try {
    if ("workAddressId" in p.data) {
      const a = (await companyLocations(binding.company.id)).find((l) => l.id === (p.data as { workAddressId: string }).workAddressId && l.shipTo);
      if (!a) return NextResponse.json({ error: "Pick one of the company's Ship To addresses." }, { status: 400 });
      const person = await prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { requesterProfile: { select: { id: true } } } });
      if (person?.requesterProfile) await prisma.requesterProfile.update({ where: { id: person.requesterProfile.id }, data: { work_site_id: a.siteId } });
      return NextResponse.json({ ok: true });
    }
    if (!binding.isAdmin) return NextResponse.json({ error: "Only a company admin can change the addresses." }, { status: 403 });
    const seller = p.data.seller || (await isSellerCompany(binding.company.id));
    const buys = (await prisma.companyMembership.count({ where: { company_id: binding.company.id, status: "APPROVED", person: { requesterProfile: { isNot: null } } } })) > 0;
    const locations = await saveCompanyLocations(binding.company.id, p.data.locations, { seller, buyer: buys || !seller });
    // The person's own address (publishing reads it): the first company address, if they have none yet.
    const me = await prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { id: true, site_id: true } });
    if (me && !me.site_id && locations[0]) await prisma.person.update({ where: { id: me.id }, data: { site_id: locations[0].siteId } });
    return NextResponse.json({ ok: true, locations });
  } catch (e) {
    if (e instanceof OnboardingError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
