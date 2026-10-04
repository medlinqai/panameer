import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { setPathInterest } from "@/lib/path-interest";
import { getSessionViewer } from "@/lib/session";

const BODY = z.object({
  pathId: z.string().uuid(),
  wanted: z.boolean().default(true),
});

export async function POST(request: Request) {
  const viewer = await getSessionViewer();
  if (!viewer) {
    return NextResponse.json(
      { error: "Sign in to tell us you want this one." },
      { status: 401 }
    );
  }

  const parsed = BODY.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "That isn't a valid request." }, { status: 400 });
  }
  const { pathId, wanted } = parsed.data;

  const path = await prisma.learningPath.findFirst({
    where: { id: pathId, status: "PUBLISHED" },
    select: { id: true },
  });
  if (!path) {
    return NextResponse.json({ error: "That learning path isn't available." }, { status: 404 });
  }

  await setPathInterest(viewer.userId, pathId, wanted);

  const count = await prisma.pathInterest.count({
    where: { learning_path_id: pathId, wanted: true },
  });
  return NextResponse.json({ ok: true, wanted, count });
}
