import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionViewer } from "@/lib/session";
import { getCompanyBinding } from "@/lib/company";
import { prisma } from "@/lib/prisma";

// Admin-only: whether members' public profiles show the company name. Company resolved from the session.
const Body = z.object({ show: z.boolean() });

export async function POST(req: Request) {
  const viewer = await getSessionViewer();
  if (!viewer) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const binding = await getCompanyBinding(viewer);
  if (!binding?.isAdmin) return NextResponse.json({ error: "Only a company admin can change this." }, { status: 403 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "That didn't look right." }, { status: 400 });
  await prisma.company.update({ where: { id: binding.company.id }, data: { show_on_profiles: parsed.data.show } });
  return NextResponse.json({ ok: true });
}
