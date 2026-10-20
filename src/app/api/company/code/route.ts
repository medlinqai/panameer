import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { codeAvailable, setCompanyCode } from "@/lib/company-code";

// NB-E000: the company code — live "Available / Taken" check (GET) and change (POST) by the company's admins or Panameer admins.
async function mayEdit(userId: string, isAdmin: boolean, companyId: string) {
  if (isAdmin) return true;
  const me = await prisma.person.findUnique({ where: { user_id: userId }, select: { id: true } });
  return !!me && !!(await prisma.companyMembership.findFirst({ where: { person_id: me.id, company_id: companyId, role: "ADMIN", status: "APPROVED" }, select: { id: true } }));
}

export async function GET(request: Request) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const url = new URL(request.url);
  return NextResponse.json(await codeAvailable(url.searchParams.get("code") ?? "", url.searchParams.get("companyId") ?? undefined));
}

export async function POST(request: Request) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const { companyId, code } = ((await request.json().catch(() => ({}))) ?? {}) as { companyId?: string; code?: string };
  if (!companyId || !code) return NextResponse.json({ error: "Missing company or code." }, { status: 400 });
  if (!(await mayEdit(gate.userId, gate.isSystemAdmin || gate.isAdmin, companyId))) return NextResponse.json({ error: "Only the company's admins can change its code." }, { status: 403 });
  try {
    return NextResponse.json({ code: await setCompanyCode(companyId, code) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "That didn't save." }, { status: 400 });
  }
}
