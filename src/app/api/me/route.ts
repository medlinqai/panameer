import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionViewer } from "@/lib/session";
import { getMe } from "@/lib/me";

export async function GET() {
  const viewer = await getSessionViewer();
  if (!viewer) {
    return NextResponse.json(
      { error: "Unauthenticated" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  const me = await getMe(viewer);
  if (me) {
    return NextResponse.json(me, { headers: { "Cache-Control": "no-store" } });
  }

  const user = await prisma.user.findUnique({
    where: { id: viewer.userId },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json(
      { error: "Unknown user" },
      { status: 404, headers: { "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(
    {
      person: null,
      company: null,
      pAccount: null,
      providerProfile: null,
      buyerProfile: null,
      orgCompanyCount: 0,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
