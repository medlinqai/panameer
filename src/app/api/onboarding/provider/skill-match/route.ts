import { OFFERABLE, activeCatalogId } from "@/lib/catalog";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionViewer } from "@/lib/session";
import { didYouMean, matchSkill } from "@/lib/skill-match";

export async function GET(request: Request) {
  const viewer = await getSessionViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 120);
  if (!q) return NextResponse.json({ kind: "none" });

  const catalogId = await activeCatalogId();
  const rows = await prisma.skill.findMany({
    where: catalogId ? { ...OFFERABLE, catalog_id: catalogId } : OFFERABLE,
    select: { id: true, name: true, is_custom: true },
  });
  const candidates = rows.map((c) => ({ id: c.id, name: c.name, isCustom: c.is_custom }));
  const m = matchSkill(q, candidates);

  if (m.kind === "exact") {
    return NextResponse.json({ kind: "exact", skill: m.skill });
  }
  if (m.kind === "near") {
    return NextResponse.json({
      kind: "near",
      skill: m.skill,
      typed: m.typed,
      prompt: didYouMean(m.skill.name),
    });
  }
  return NextResponse.json({ kind: "none" });
}
