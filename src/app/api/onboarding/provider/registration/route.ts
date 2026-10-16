import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { OnboardingError } from "@/lib/onboarding";
import { companyLocations, ownAddress, saveOwnAddress } from "@/lib/locations";
import { companyBusinessTypeIds } from "@/lib/business-types";
import { SELLER_REG_STEPS, sellerRegistration, type SellerRegStep } from "@/lib/seller-registration";
import { touchRegistration } from "@/lib/registration-followup";

// SR-E001–E004: the seller's pre-verify Company · Locations · Review state, so a refresh returns to the step.
// Privacy (as buyers): a PENDING joiner gets the company name only — no details, no addresses.
export async function GET() {
  const viewer = await guardApi("authenticated");
  if (viewer instanceof NextResponse) return viewer;
  const p = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: {
      id: true,
      first_name: true,
      last_name: true,
      title: true,
      photo_url: true,
      phone: true,
      user: { select: { email: true } },
      companyMemberships: { where: { status: { in: ["APPROVED", "PENDING"] } }, orderBy: { updated_at: "desc" }, take: 1, select: { status: true, role: true, company: { select: { id: true, name: true, legal_name: true, website: true, description: true, invoice_email: true } } } },
    },
  });
  if (!p) return NextResponse.json({ error: "No person" }, { status: 404 });
  const m = p.companyMemberships[0];
  const approved = m?.status === "APPROVED";
  return NextResponse.json({
    email: p.user?.email ?? "",
    name: [p.first_name, p.last_name].filter(Boolean).join(" "),
    // SO-E003: Who Is Selling? (same person fields the profile wizard's Title and Photo steps read).
    seller: { firstName: p.first_name ?? "", lastName: p.last_name ?? "", title: p.title ?? "", photoUrl: p.photo_url, phone: p.phone ?? "" },
    ...(await sellerRegistration(p.id).then((r) => ({ step: r.step, registered: r.registered }))),
    company: m
      ? approved
        ? { status: m.status, owner: m.role === "ADMIN", id: m.company.id, name: m.company.name, legalName: m.company.legal_name && m.company.legal_name !== m.company.name ? m.company.legal_name : "", website: m.company.website ?? "", description: m.company.description ?? "", companyEmail: m.company.invoice_email ?? "", businessTypeIds: await companyBusinessTypeIds(m.company.id) }
        : { status: m.status, owner: false, name: m.company.name }
      : null,
    locations: approved ? await companyLocations(m.company.id) : [],
    own: await ownAddress(p.id),
  });
}

const Own = z.object({ line1: z.string().trim().max(200).nullish(), line2: z.string().trim().max(200).nullish(), city: z.string().trim().max(120).nullish(), state: z.string().trim().max(120).nullish(), postalCode: z.string().trim().max(40).nullish(), country: z.string().trim().max(80).nullish() });

const Seller = z.object({ firstName: z.string().trim().min(1).max(80), lastName: z.string().trim().min(1).max(80), title: z.string().trim().min(1).max(120), phone: z.string().trim().max(40) });
const Body = z.union([
  z.object({ own: Own }),
  z.object({ seller: Seller }),
  z.object({ step: z.enum(SELLER_REG_STEPS) }),
  z.object({ complete: z.literal(true) }),
]);

/** Who Is Selling? · a joiner's own work address (owners save the company's via /api/company/locations) · the step reached · Finish. */
export async function POST(req: Request) {
  const viewer = await guardApi("authenticated");
  if (viewer instanceof NextResponse) return viewer;
  const b = Body.safeParse(await req.json().catch(() => null));
  if (!b.success) return NextResponse.json({ error: "Check the form." }, { status: 400 });
  const p = await prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { id: true, providerProfile: { select: { id: true, registration_step: true } } } });
  if (!p?.providerProfile) return NextResponse.json({ error: "No seller profile" }, { status: 404 });
  await touchRegistration(p.id);
  const pp = p.providerProfile;
  // The step only moves forward (as the buyer's resume point).
  const forward = (s: SellerRegStep) => SELLER_REG_STEPS.indexOf(s) > SELLER_REG_STEPS.indexOf((pp.registration_step as SellerRegStep) ?? "seller") || !pp.registration_step;
  try {
    const d = b.data;
    if ("own" in d) await saveOwnAddress(p.id, d.own);
    else if ("seller" in d) {
      await prisma.person.update({ where: { id: p.id }, data: { first_name: d.seller.firstName, last_name: d.seller.lastName, title: d.seller.title, phone: d.seller.phone || null } });
      if (forward("company")) await prisma.providerProfile.update({ where: { id: pp.id }, data: { registration_step: "company" } });
    } else if ("step" in d) {
      if (forward(d.step)) await prisma.providerProfile.update({ where: { id: pp.id }, data: { registration_step: d.step } });
    } else await prisma.providerProfile.update({ where: { id: pp.id }, data: { registration_step: "review", registration_completed_at: new Date() } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof OnboardingError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
