import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardApi } from "@/lib/guard";

/** Scott 10-16: the title the AI read off the latest résumé — offered on the Title step, never applied on its own. */
export async function GET() {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const imp = await prisma.profileImport.findFirst({
    where: { providerProfile: { person: { user_id: gate.userId } }, status: "PARSED" },
    orderBy: { created_at: "desc" },
    select: { parsed: true },
  });
  const title = ((imp?.parsed as { headline?: string } | null)?.headline ?? "").trim().slice(0, 200);
  return NextResponse.json({ title: title || null });
}
