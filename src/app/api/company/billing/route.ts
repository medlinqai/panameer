import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { getCompanyBinding, saveRegisteredAddress } from "@/lib/company";
import { prisma } from "@/lib/prisma";

const Body = z.object({
  invoiceEmail: z.string().trim().email("Enter a valid invoice email").max(200),
  address: z.object({ line1: z.string().trim().min(1, "Add the street address").max(200), city: z.string().trim().max(120).nullish(), state: z.string().trim().max(120).nullish(), postalCode: z.string().trim().max(40).nullish(), country: z.string().trim().max(80).nullish() }),
});

// WN-E001: a buyer's billing details for orders — billing address + invoice email. Company admins only.
export async function POST(req: Request) {
  const viewer = await guardApi("authenticated");
  if (viewer instanceof NextResponse) return viewer;
  const binding = await getCompanyBinding(viewer);
  if (!binding || binding.status !== "APPROVED" || !binding.isAdmin) return NextResponse.json({ error: "Only a company admin can change these" }, { status: 403 });
  const b = Body.safeParse(await req.json().catch(() => null));
  if (!b.success) return NextResponse.json({ error: b.error.issues[0]?.message ?? "Check the form" }, { status: 400 });
  await saveRegisteredAddress(binding.company.id, b.data.address);
  await prisma.company.update({ where: { id: binding.company.id }, data: { invoice_email: b.data.invoiceEmail } });
  return NextResponse.json({ ok: true });
}
